import { Router, type IRouter } from "express";

const HCP_BASE = "https://api.housecallpro.com";

function hcpHeaders() {
  return {
    Authorization: `Token ${process.env.HOUSECALLPRO_API_KEY}`,
    "Content-Type": "application/json",
  };
}

async function hcpGet(path: string, params?: Record<string, string>) {
  const url = new URL(`${HCP_BASE}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), { headers: hcpHeaders() });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HCP ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

const router: IRouter = Router();

/* ── Simple in-memory cache ───────────────────────────────────── */
interface CacheEntry<T> { data: T; expiresAt: number }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cache = new Map<string, CacheEntry<any>>();
function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expiresAt) return entry.data as T;
  return null;
}
function setCached<T>(key: string, data: T, ttlMs = 3 * 60 * 1000): void {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

router.get("/hcp/jobs", async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const params: Record<string, string> = {
      page: String(req.query.page ?? 1),
      page_size: String(req.query.page_size ?? 50),
    };

    if (req.query.date === "today") {
      params.scheduled_start_min = startOfDay.toISOString();
      params.scheduled_start_max = endOfDay.toISOString();
    }

    const data = await hcpGet("/jobs", params) as {
      jobs: HcpJob[];
      total_items: number;
      total_pages: number;
      page: number;
      page_size: number;
    };

    if (data.jobs.length > 0) {
      req.log.info({ rawJobSample: data.jobs[0] }, "hcp raw job fields (first result)");
    }
    const normalized = data.jobs
      .map(normalizeJob)
      .filter((j) => j.customer && j.customer !== "Unknown" && j.customer.toLowerCase() !== "no customer");
    res.json({
      jobs: normalized,
      total_items: data.total_items,
      total_pages: data.total_pages,
      page: data.page,
      syncedAt: new Date().toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "hcp /jobs failed");
    res.status(502).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

router.get("/hcp/customers", async (req, res) => {
  try {
    const CACHE_KEY = "hcp:customers";
    const cached = getCached(CACHE_KEY);
    if (cached) { res.json(cached); return; }

    // 3 parallel calls: 1 customer page + 1 job page (for stats) + estimates count
    const [custPage1, jobsPage1, estimatesData] = await Promise.all([
      hcpGet("/customers", { page: "1", page_size: "100" }) as Promise<HcpCustomerPage>,
      hcpGet("/jobs",      { page: "1", page_size: "100" }) as Promise<HcpJobPage>,
      hcpGet("/estimates", { page: "1", page_size: "1"   }) as Promise<{ total_items: number }>,
    ]);

    // Build per-customer stats from recent jobs
    const statsMap = new Map<string, CustomerStats>();
    const allJobs = jobsPage1.jobs;

    for (const job of allJobs) {
      const custId = job.customer?.id;
      if (!custId) continue;
      const existing = statsMap.get(custId);
      const jobDate = job.schedule?.scheduled_start ?? job.created_at ?? "";
      const amount = resolveAmount(job) ?? 0;

      if (!existing) {
        statsMap.set(custId, {
          lastJobDate: jobDate,
          lastJobService: job.description ?? "",
          jobCount: 1,
          totalSpent: amount,
        });
      } else {
        existing.jobCount++;
        existing.totalSpent += amount;
        if (jobDate > existing.lastJobDate) {
          existing.lastJobDate = jobDate;
          existing.lastJobService = job.description ?? "";
        }
      }
    }

    const allCustomers = custPage1.customers ?? [];
    const normalized = allCustomers
      .filter((c) => c.first_name || c.last_name)
      .map((c) => {
        const stats = statsMap.get(c.id);
        const phone = c.mobile_number ?? c.home_number ?? c.work_number ?? "";
        const city = c.addresses?.[0]?.city ?? "";
        const lastJobDate = stats?.lastJobDate ?? "";
        const daysSince = lastJobDate
          ? Math.floor((Date.now() - new Date(lastJobDate).getTime()) / 86400000)
          : null;

        return {
          id: c.id,
          name: [c.first_name, c.last_name].filter(Boolean).join(" "),
          phone: phone ? phone.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3") : "",
          email: c.email ?? "",
          city,
          lastJobDate,
          lastJobService: stats?.lastJobService ?? "",
          jobCount: stats?.jobCount ?? 0,
          totalSpent: stats?.totalSpent ?? 0,
          status: dormantStatus(daysSince),
          daysSince,
        };
      })
      .sort((a, b) => (b.lastJobDate > a.lastJobDate ? 1 : -1));

    const dormant365 = normalized.filter((c) => c.daysSince !== null && c.daysSince > 365).length;
    const avgLtv = normalized.length
      ? Math.round(normalized.reduce((s, c) => s + c.totalSpent, 0) / normalized.length)
      : 0;

    const payload = {
      customers: normalized,
      total_items: custPage1.total_items,
      estimates_count: estimatesData.total_items,
      dormant_365: dormant365,
      avg_ltv: avgLtv,
      syncedAt: new Date().toISOString(),
    };
    setCached(CACHE_KEY, payload);
    res.json(payload);
  } catch (err) {
    req.log.error({ err }, "hcp /customers failed");
    res.status(502).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

interface HcpCustomerPage {
  customers: RawCustomer[];
  total_items: number;
}

interface RawCustomer {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  mobile_number?: string;
  home_number?: string;
  work_number?: string;
  addresses?: { city?: string }[];
}

interface HcpJobPage {
  jobs: HcpJob[];
  total_items: number;
}

interface CustomerStats {
  lastJobDate: string;
  lastJobService: string;
  jobCount: number;
  totalSpent: number;
}

function dormantStatus(days: number | null): string {
  if (days === null) return "No Jobs";
  if (days <= 90)  return "Active";
  if (days <= 180) return "Dormant 3mo";
  if (days <= 365) return "Dormant 6mo";
  return "Dormant 1yr+";
}

router.get("/hcp/invoices", async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
    const data = await hcpGet("/invoices", {
      page: String(req.query.page ?? 1),
      page_size: String(req.query.page_size ?? 50),
      created_start: startOfMonth,
      created_end: endOfMonth,
    });
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "hcp /invoices failed");
    res.status(502).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

/* ── Types & normalization ─────────────────────────────────── */

interface HcpEmployee {
  first_name: string;
  last_name: string;
  color_hex?: string;
}

interface HcpJob {
  id: string;
  invoice_number?: string;
  description?: string;
  work_status: string;
  total_amount?: number;
  invoice_total?: number;
  total?: number;
  price?: number;
  job_total?: number;
  outstanding_balance?: number;
  subtotal?: number;
  customer?: { id?: string; first_name?: string; last_name?: string; mobile_number?: string };
  address?: { street?: string; street_line_2?: string; city?: string; state?: string; zip?: string };
  schedule?: { scheduled_start?: string; scheduled_end?: string };
  created_at?: string;
  assigned_employees?: HcpEmployee[];
  [key: string]: unknown;
}

/** Resolve total from whichever field HCP populates; divide by 100 (cents). Returns null if no positive value found. */
function resolveAmount(j: HcpJob): number | null {
  const candidates = [
    j.total_amount,
    j.invoice_total,
    j.total,
    j.price,
    j.job_total,
    j.outstanding_balance,
    j.subtotal,
  ];
  for (const val of candidates) {
    if (val != null && val > 0) return val / 100;
  }
  return null;
}

const CT = "America/Chicago";

function fmtCT(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    timeZone: CT,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function normalizeJob(j: HcpJob) {
  const tech = j.assigned_employees?.[0];
  const scheduledStart = j.schedule?.scheduled_start;
  const scheduledEnd   = j.schedule?.scheduled_end;
  const timeStr    = scheduledStart ? fmtCT(scheduledStart) : "";
  const timeEndStr = scheduledEnd   ? fmtCT(scheduledEnd)   : "";
  const scheduledDate = scheduledStart ? new Date(scheduledStart).toISOString().slice(0, 10) : "";

  return {
    id: j.id,
    invoiceNumber: j.invoice_number ?? "",
    customer: [j.customer?.first_name, j.customer?.last_name].filter(Boolean).join(" ") || "Unknown",
    customerPhone: j.customer?.mobile_number ?? "",
    service: j.description ?? "",
    status: normalizeStatus(j.work_status),
    rawStatus: j.work_status,
    totalAmount: resolveAmount(j),
    technician: tech ? `${tech.first_name} ${tech.last_name}` : "",
    technicianFirst: tech?.first_name ?? "",
    techColor: tech?.color_hex ? `#${tech.color_hex}` : "#6b7a90",
    location: [j.address?.street, j.address?.city].filter(Boolean).join(", "),
    time: timeStr,
    timeEnd: timeEndStr,
    scheduledDate,
    scheduledStart: scheduledStart ?? "",
  };
}

function normalizeStatus(s: string): "Complete" | "In Progress" | "Scheduled" | "Pending" | "Cancelled" {
  switch (s) {
    case "completed":
    case "needs_invoicing":
      return "Complete";
    case "in_progress":
      return "In Progress";
    case "scheduled":
      return "Scheduled";
    case "cancelled":
      return "Cancelled";
    default:
      return "Pending";
  }
}

export default router;
