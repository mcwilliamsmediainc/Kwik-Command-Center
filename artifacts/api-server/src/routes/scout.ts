import { Router, type IRouter } from "express";

const PLACES_BASE = "https://maps.googleapis.com/maps/api/place";
const HCP_BASE    = "https://api.housecallpro.com";

/* ── Shared cache ─────────────────────────────────────────────── */
interface CacheEntry<T> { data: T; expiresAt: number }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cache = new Map<string, CacheEntry<any>>();
function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expiresAt) return entry.data as T;
  return null;
}
function setCached<T>(key: string, data: T, ttlMs = 10 * 60 * 1000): void {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

/* ── HCP helpers ──────────────────────────────────────────────── */
function hcpHeaders() {
  return {
    Authorization: `Token ${process.env.HOUSECALLPRO_API_KEY}`,
    "Content-Type": "application/json",
  };
}
async function hcpGet(path: string, params?: Record<string, string>) {
  const url = new URL(`${HCP_BASE}${path}`);
  if (params) for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), { headers: hcpHeaders() });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HCP ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

/* ── Amount resolver (cents → dollars) ───────────────────────── */
function resolveAmount(job: Record<string, unknown>): number {
  const fields = ["total_amount","invoice_total","total","price","job_total","outstanding_balance","subtotal"];
  for (const f of fields) {
    const v = job[f];
    if (typeof v === "number" && v > 0) return v / 100;
  }
  return 0;
}

/* ── Google Places helpers ────────────────────────────────────── */
interface PlacesTextSearchResult {
  candidates?: Array<{ place_id: string }>;
  results?: Array<{ place_id: string }>; // textsearch fallback
  status?: string;
}
interface PlacesDetailsResult {
  result?: {
    name?: string;
    rating?: number;
    user_ratings_total?: number;
    reviews?: Array<{
      author_name: string;
      rating: number;
      relative_time_description: string;
      text: string;
      time: number;
    }>;
  };
  status?: string;
}

async function findPlaceId(apiKey: string): Promise<string> {
  const cached = getCached<string>("scout:place_id");
  if (cached) return cached;

  const url = new URL(`${PLACES_BASE}/findplacefromtext/json`);
  url.searchParams.set("input", "Tulsa Kwik Dry Total Cleaning Tulsa OK");
  url.searchParams.set("inputtype", "textquery");
  url.searchParams.set("fields", "place_id,name,rating,user_ratings_total");
  url.searchParams.set("key", apiKey);

  const res = await fetch(url.toString());
  const data = await res.json() as PlacesTextSearchResult;
  const hits = data.candidates ?? data.results ?? [];
  if (!hits.length) throw new Error(`Places findplacefromtext returned no candidates (status: ${data.status})`);

  const placeId = hits[0].place_id;
  setCached("scout:place_id", placeId, 24 * 60 * 60 * 1000); // cache place_id for 24 h
  return placeId;
}

/* ── HCP job type (minimal) ───────────────────────────────────── */
interface HcpJobRaw {
  lead_source?: string;
  [key: string]: unknown;
}
interface HcpJobPage { jobs: HcpJobRaw[]; total_items: number }

const router: IRouter = Router();

/* ────────────────────────────────────────────────────────────────
   GET /api/scout/reviews
   Returns Google rating, total review count, and up to 5 most
   recent reviews (text, rating, author, relative date).
   Note: Google Places API does not expose owner responses,
   so hasResponse is always false.
──────────────────────────────────────────────────────────────── */
router.get("/scout/reviews", async (req, res) => {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    res.status(503).json({
      error: "GOOGLE_PLACES_API_KEY not configured. Add it in Secrets (Google Cloud Console → Places API).",
    });
    return;
  }

  try {
    const CACHE_KEY = "scout:reviews";
    const cached = getCached(CACHE_KEY);
    if (cached) { res.json(cached); return; }

    const placeId = await findPlaceId(apiKey);

    const detailsUrl = new URL(`${PLACES_BASE}/details/json`);
    detailsUrl.searchParams.set("place_id", placeId);
    detailsUrl.searchParams.set("fields", "name,rating,user_ratings_total,reviews");
    detailsUrl.searchParams.set("reviews_sort", "newest");
    detailsUrl.searchParams.set("key", apiKey);

    const detailsRes = await fetch(detailsUrl.toString());
    const details = await detailsRes.json() as PlacesDetailsResult;

    if (!details.result) {
      throw new Error(`Place Details returned no result (status: ${details.status}, placeId: ${placeId})`);
    }

    const { rating = 0, user_ratings_total = 0, reviews = [] } = details.result;

    const payload = {
      placeId,
      rating,
      totalReviews: user_ratings_total,
      reviews: reviews.map(r => ({
        author:      r.author_name,
        rating:      r.rating,
        text:        r.text,
        when:        r.relative_time_description,
        time:        r.time,
        hasResponse: false, // Places API does not surface owner responses
      })),
      syncedAt: new Date().toISOString(),
    };

    setCached(CACHE_KEY, payload);
    res.json(payload);
  } catch (err) {
    req.log.error({ err }, "scout /reviews failed");
    res.status(502).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

/* ────────────────────────────────────────────────────────────────
   GET /api/scout/leadsources
   Fetches current-month jobs from HCP and groups by lead_source.
   Returns sources sorted by job count descending.
──────────────────────────────────────────────────────────────── */
router.get("/scout/leadsources", async (req, res) => {
  try {
    const CACHE_KEY = "scout:leadsources";
    const cached = getCached(CACHE_KEY);
    if (cached) { res.json(cached); return; }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfMonth   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

    const params = { page_size: "200", scheduled_start_min: startOfMonth, scheduled_start_max: endOfMonth };

    const [p1, p2] = await Promise.all([
      hcpGet("/jobs", { ...params, page: "1" }) as Promise<HcpJobPage>,
      hcpGet("/jobs", { ...params, page: "2" }) as Promise<HcpJobPage>,
    ]);

    const allJobs = [...(p1.jobs ?? []), ...(p2.jobs ?? [])];

    const sourceMap = new Map<string, { jobs: number; revenue: number }>();
    for (const job of allJobs) {
      const raw = job.lead_source;
      const source: string = typeof raw === "string" && raw.trim() ? raw.trim() : "Unknown";
      const existing = sourceMap.get(source);
      const amount = resolveAmount(job);
      if (existing) { existing.jobs++; existing.revenue += amount; }
      else           { sourceMap.set(source, { jobs: 1, revenue: amount }); }
    }

    const total = allJobs.length || 1;
    const sources = [...sourceMap.entries()]
      .map(([label, s]) => ({
        label,
        jobs:    s.jobs,
        revenue: Math.round(s.revenue * 100) / 100,
        pct:     Math.round((s.jobs / total) * 100),
      }))
      .sort((a, b) => b.jobs - a.jobs);

    const payload = {
      month:     now.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      totalJobs: allJobs.length,
      sources,
      syncedAt:  new Date().toISOString(),
    };

    setCached(CACHE_KEY, payload, 5 * 60 * 1000);
    res.json(payload);
  } catch (err) {
    req.log.error({ err }, "scout /leadsources failed");
    res.status(502).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

export default router;
