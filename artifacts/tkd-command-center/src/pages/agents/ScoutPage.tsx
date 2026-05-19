import { useEffect, useState } from "react";
import { Star, ExternalLink, ArrowUpRight } from "lucide-react";

/* ── Types ────────────────────────────────────────────────────── */
interface Review {
  author: string;
  rating: number;
  text: string;
  when: string;
  time: number;
  hasResponse: boolean;
}
interface ReviewsData {
  placeId: string;
  rating: number;
  totalReviews: number;
  reviews: Review[];
  syncedAt: string;
}
interface LeadSource {
  label: string;
  jobs: number;
  revenue: number;
  pct: number;
}
interface LeadSourcesData {
  month: string;
  totalJobs: number;
  sources: LeadSource[];
  syncedAt: string;
}

/* ── Source color palette ─────────────────────────────────────── */
const SOURCE_COLORS = ["#2b4fac", "#3db54a", "#f97316", "#2563eb", "#ec4899", "#8b5cf6", "#94a3b8"];
function sourceColor(i: number) { return SOURCE_COLORS[i % SOURCE_COLORS.length]; }

/* ── Platform health — partially static, Yelp note added ─────── */
const PLATFORMS = [
  { name: "Google",    pct: 100, barColor: "#2b4fac", badge: null,             badgeText: "Loading…" },
  { name: "Birdeye",   pct: 95,  barColor: "#3db54a", badge: null,             badgeText: "5.0 ★" },
  { name: "Yelp",      pct: 20,  barColor: "#ef4444", badge: "needs-fix",      badgeText: "Duplicate Listings" },
  { name: "BBB",       pct: 55,  barColor: "#eab308", badge: "not-accredited", badgeText: "Not Accredited" },
  { name: "Facebook",  pct: 45,  barColor: "#2563eb", badge: "active",         badgeText: "Active" },
  { name: "Instagram", pct: 30,  barColor: "#ec4899", badge: "active",         badgeText: "Active" },
];

/* ── Badge helper ─────────────────────────────────────────────── */
function PlatformBadge({ type, text }: { type: string | null; text: string }) {
  if (type === "needs-fix") {
    return (
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
        style={{ backgroundColor: "#fff7ed", color: "#c2410c", border: "1px solid #fed7aa" }}>
        {text}
      </span>
    );
  }
  if (type === "not-accredited") {
    return (
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
        style={{ backgroundColor: "#fefce8", color: "#854d0e", border: "1px solid #fde68a" }}>
        {text}
      </span>
    );
  }
  if (type === "active") {
    return (
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
        style={{ backgroundColor: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0" }}>
        {text}
      </span>
    );
  }
  return <span className="text-xs font-medium" style={{ color: "#6b7a90" }}>{text}</span>;
}

/* ── Stars ────────────────────────────────────────────────────── */
function Stars({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className="w-3.5 h-3.5"
          style={{ color: "#eab308", fill: i < count ? "#eab308" : "none" }}
        />
      ))}
    </div>
  );
}

/* ── Animated bar ─────────────────────────────────────────────── */
function AnimatedBar({ pct, color }: { pct: number; color: string }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), 120);
    return () => clearTimeout(t);
  }, [pct]);
  return (
    <div className="w-full rounded-full overflow-hidden" style={{ height: "8px", backgroundColor: "#f0f2f5" }}>
      <div
        className="h-full rounded-full"
        style={{ width: `${width}%`, backgroundColor: color, transition: "width 0.7s cubic-bezier(0.34,1.12,0.64,1)" }}
      />
    </div>
  );
}

/* ── Skeleton pulse ───────────────────────────────────────────── */
function Skeleton({ w = "w-24", h = "h-3" }: { w?: string; h?: string }) {
  return <div className={`${w} ${h} rounded animate-pulse`} style={{ backgroundColor: "#f0f0f0" }} />;
}

/* ── Component ────────────────────────────────────────────────── */
export function ScoutPage() {
  const [reviewsData,   setReviewsData]   = useState<ReviewsData | null>(null);
  const [reviewsErr,    setReviewsErr]    = useState<string | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  const [sourcesData,   setSourcesData]   = useState<LeadSourcesData | null>(null);
  const [sourcesErr,    setSourcesErr]    = useState<string | null>(null);
  const [sourcesLoading, setSourcesLoading] = useState(true);

  useEffect(() => {
    fetch("/api/scout/reviews")
      .then(r => r.json())
      .then((d: ReviewsData & { error?: string }) => {
        if (d.error) { setReviewsErr(d.error); }
        else          { setReviewsData(d); }
      })
      .catch(e => setReviewsErr(String(e)))
      .finally(() => setReviewsLoading(false));

    fetch("/api/scout/leadsources")
      .then(r => r.json())
      .then((d: LeadSourcesData & { error?: string }) => {
        if (d.error) { setSourcesErr(d.error); }
        else          { setSourcesData(d); }
      })
      .catch(e => setSourcesErr(String(e)))
      .finally(() => setSourcesLoading(false));
  }, []);

  /* ── Derived values ── */
  const rating       = reviewsData?.rating ?? null;
  const totalReviews = reviewsData?.totalReviews ?? null;
  // Show reviews that don't have a response (hasResponse always false from Places API
  // since it doesn't expose owner responses — show 3 most recent)
  const displayReviews = (reviewsData?.reviews ?? []).slice(0, 5);
  const sources = sourcesData?.sources ?? [];

  /* ── Google row for Platform Health ── */
  const googleBadgeText = reviewsData
    ? `${reviewsData.totalReviews} reviews · ${reviewsData.rating}★`
    : "Loading…";
  const platformRows = PLATFORMS.map(p =>
    p.name === "Google" ? { ...p, badgeText: googleBadgeText } : p
  );

  /* ── KPI definitions ── */
  const kpis = [
    {
      label: "Google Rating",
      value: reviewsLoading ? "—" : (rating !== null ? `${rating.toFixed(1)}★` : "N/A"),
      sub1: reviewsLoading ? "loading…" : (totalReviews !== null ? `${totalReviews.toLocaleString()} reviews` : reviewsErr ?? "unavailable"),
      sub2: reviewsData ? `↑ synced ${new Date(reviewsData.syncedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` : "",
      sub2Color: "#854d0e",
      accent: "#eab308",
    },
    {
      label: "Ad Spend MTD",
      value: "$450",
      sub1: "Google Ads",
      sub2: "$12.40/lead",
      sub2Color: "#1e40af",
      accent: "#2b4fac",
    },
    {
      label: "Email Open Rate",
      value: "34%",
      sub1: "312 sent",
      sub2: "3 replies in pipeline",
      sub2Color: "#15803d",
      accent: "#3db54a",
    },
    {
      label: "Total Reviews",
      value: reviewsLoading ? "—" : (totalReviews !== null ? totalReviews.toLocaleString() : "N/A"),
      sub1: "Google Business Profile",
      sub2: "",
      sub2Color: "#c2410c",
      accent: "#f97316",
    },
  ];

  return (
    <div className="flex flex-col gap-4">

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="bg-white rounded-lg px-3 py-3 md:px-4 md:py-3.5"
            style={{ border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", borderTop: `2px solid ${k.accent}` }}
          >
            <p className="text-[9px] md:text-xs font-semibold uppercase mb-1.5" style={{ color: "#6b7a90", letterSpacing: "0.6px" }}>
              {k.label}
            </p>
            <p className="text-2xl font-bold tracking-tight mb-1" style={{ color: "#1a2333" }}>
              {k.value}
            </p>
            <p className="text-[10px] md:text-xs" style={{ color: "#64748b" }}>{k.sub1}</p>
            {k.sub2 && (
              <p className="text-[10px] md:text-xs font-semibold mt-0.5" style={{ color: k.sub2Color }}>
                {k.sub2}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* ── Two-column mid section ── */}
      <div className="grid grid-cols-2 gap-4">

        {/* Lead Sources */}
        <div className="bg-white rounded-lg overflow-hidden" style={{ border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderBottom: "1px solid #f0f0f0" }}>
            <p className="text-sm font-bold" style={{ color: "#1a2333" }}>
              Lead Sources — {sourcesData?.month ?? "May 2026"}
            </p>
            <a href="https://app.housecallpro.com" target="_blank" rel="noreferrer"
              className="text-xs font-medium flex items-center gap-1 hover:underline" style={{ color: "#2b4fac" }}>
              HouseCall Pro <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="px-5 py-4 space-y-4">
            {sourcesLoading ? (
              [1,2,3,4].map(i => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between"><Skeleton w="w-28" /><Skeleton w="w-16" /></div>
                  <Skeleton w="w-full" h="h-2" />
                </div>
              ))
            ) : sourcesErr ? (
              <p className="text-xs py-2" style={{ color: "#ef4444" }}>{sourcesErr}</p>
            ) : sources.length === 0 ? (
              <p className="text-xs py-2" style={{ color: "#6b7a90" }}>No job data for this month yet.</p>
            ) : (
              sources.map((s, i) => (
                <div key={s.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium" style={{ color: "#1a2333" }}>{s.label}</span>
                    <span className="text-xs font-semibold" style={{ color: "#6b7a90" }}>
                      {s.jobs} jobs · {s.pct}%
                    </span>
                  </div>
                  <AnimatedBar pct={s.pct} color={sourceColor(i)} />
                  {s.label === "Unknown" && s.pct >= 10 && (
                    <p className="mt-1.5" style={{ fontSize: "11px", color: "#a16207" }}>
                      ⚠ {s.pct}% of leads have no source tracked. Ask call center to record lead source on every booking.
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Platform Health */}
        <div className="bg-white rounded-lg overflow-hidden" style={{ border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div className="px-5 py-3.5" style={{ borderBottom: "1px solid #f0f0f0" }}>
            <p className="text-sm font-bold" style={{ color: "#1a2333" }}>Platform Health</p>
          </div>
          <div className="px-5 py-4 space-y-4">
            {platformRows.map((p) => (
              <div key={p.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium" style={{ color: "#1a2333" }}>{p.name}</span>
                  <PlatformBadge type={p.badge} text={p.badgeText} />
                </div>
                <div className="w-full rounded-full overflow-hidden" style={{ height: "6px", backgroundColor: "#f0f2f5" }}>
                  <div className="h-full rounded-full" style={{ width: `${p.pct}%`, backgroundColor: p.barColor }} />
                </div>
                {p.name === "Yelp" && (
                  <p className="text-[10px] mt-1" style={{ color: "#94a3b8" }}>
                    Action needed: merge or remove duplicate listing
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Recent Reviews — full width ── */}
      <div className="bg-white rounded-lg overflow-hidden" style={{ border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderBottom: "1px solid #f0f0f0" }}>
          <p className="text-sm font-bold" style={{ color: "#1a2333" }}>
            Recent Reviews — Needs Response
          </p>
          {reviewsData && (
            <a
              href={`https://search.google.com/local/reviews?placeid=${reviewsData.placeId}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-medium flex items-center gap-1 hover:underline"
              style={{ color: "#2b4fac" }}
            >
              View all {reviewsData.totalReviews.toLocaleString()} <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        {reviewsLoading ? (
          <div className="grid grid-cols-3 divide-x divide-gray-100">
            {[1,2,3].map(i => (
              <div key={i} className="px-5 py-4 space-y-3">
                <Skeleton w="w-20" h="h-3" />
                <div className="space-y-1.5">
                  <Skeleton w="w-full" h="h-3" />
                  <Skeleton w="w-4/5" h="h-3" />
                  <Skeleton w="w-3/5" h="h-3" />
                </div>
                <div className="space-y-1">
                  <Skeleton w="w-24" h="h-3" />
                  <Skeleton w="w-20" h="h-2.5" />
                </div>
                <Skeleton w="w-20" h="h-7" />
              </div>
            ))}
          </div>
        ) : reviewsErr ? (
          <div className="px-5 py-6">
            <p className="text-sm font-medium mb-1" style={{ color: "#1a2333" }}>Google reviews unavailable</p>
            <p className="text-xs" style={{ color: "#ef4444" }}>{reviewsErr}</p>
            {reviewsErr.includes("GOOGLE_PLACES_API_KEY") && (
              <p className="text-xs mt-2" style={{ color: "#6b7a90" }}>
                Add <code className="px-1 py-0.5 rounded text-[11px]" style={{ backgroundColor: "#f1f5f9" }}>GOOGLE_PLACES_API_KEY</code> in Secrets.
                Get one at Google Cloud Console → APIs &amp; Services → Credentials → Places API.
              </p>
            )}
          </div>
        ) : displayReviews.length === 0 ? (
          <div className="px-5 py-6">
            <p className="text-xs" style={{ color: "#6b7a90" }}>No recent reviews found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 divide-x divide-gray-100">
            {displayReviews.map((r) => (
              <div key={`${r.author}-${r.time}`} className="px-5 py-4 flex flex-col gap-3">
                <Stars count={r.rating} />
                <p className="text-sm leading-relaxed flex-1" style={{ color: "#374151" }}>
                  "{r.text.length > 150 ? r.text.slice(0, 150) + "…" : r.text}"
                </p>
                <div>
                  <p className="text-xs font-semibold" style={{ color: "#1a2333" }}>{r.author}</p>
                  <p className="text-xs" style={{ color: "#6b7a90" }}>
                    Google · {r.when}
                  </p>
                </div>
                <button
                  className="self-start text-xs font-semibold px-3 py-1.5 rounded-md transition-colors hover:opacity-80"
                  style={{ backgroundColor: "#eff6ff", color: "#2b4fac", border: "1px solid #bfdbfe" }}
                  data-testid={`button-respond-${r.author.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}
                >
                  Respond →
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
