import { useEffect, useState } from "react";
import { Star, ExternalLink, ArrowUpRight, Phone, TrendingUp, Award } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
} from "recharts";

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
interface CtSourceStat {
  label: string;
  calls: number;
  booked: number;
  conversionRate: number;
}
interface CtWindow {
  days: number;
  totalCalls: number;
  totalBooked: number;
  conversionRate: number;
  sources: CtSourceStat[];
}
interface CtWeeklyPoint {
  weekStart: string;
  label: string;
  calls: number;
  booked: number;
}
interface CallTrackerData {
  totalCalls: number;
  windows: CtWindow[];
  weekly: CtWeeklyPoint[];
  topSources: string[];
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

  const [ctData,    setCtData]    = useState<CallTrackerData | null>(null);
  const [ctErr,     setCtErr]     = useState<string | null>(null);
  const [ctLoading, setCtLoading] = useState(true);
  const [ctDays,    setCtDays]    = useState<30 | 60 | 90>(30);

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

    fetch("/api/calltracker/leads")
      .then(r => r.json())
      .then((d: CallTrackerData & { error?: string }) => {
        if (d.error) { setCtErr(d.error); }
        else          { setCtData(d); }
      })
      .catch(e => setCtErr(String(e)))
      .finally(() => setCtLoading(false));
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

      {/* ── Call Tracker — full width ── */}
      <CallTrackerSection
        data={ctData}
        loading={ctLoading}
        err={ctErr}
        days={ctDays}
        onDaysChange={setCtDays}
      />

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

/* ── Call Tracker section ─────────────────────────────────────── */
function CallTrackerSection({
  data,
  loading,
  err,
  days,
  onDaysChange,
}: {
  data: CallTrackerData | null;
  loading: boolean;
  err: string | null;
  days: 30 | 60 | 90;
  onDaysChange: (d: 30 | 60 | 90) => void;
}) {
  const win = data?.windows.find((w) => w.days === days) ?? null;
  const topSet = new Set(data?.topSources ?? []);

  return (
    <div className="bg-white rounded-lg overflow-hidden" style={{ border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
      {/* header */}
      <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderBottom: "1px solid #f0f0f0" }}>
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4" style={{ color: "#2b4fac" }} />
          <p className="text-sm font-bold" style={{ color: "#1a2333" }}>Call Tracker — Lead Source Performance</p>
        </div>
        <div className="flex items-center gap-1">
          {([30, 60, 90] as const).map((d) => (
            <button
              key={d}
              onClick={() => onDaysChange(d)}
              data-testid={`button-ct-window-${d}`}
              className="text-xs font-semibold px-2.5 py-1 rounded-md transition-colors"
              style={
                d === days
                  ? { backgroundColor: "#2b4fac", color: "#fff" }
                  : { backgroundColor: "#f1f5f9", color: "#475569" }
              }
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="px-5 py-6 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between"><Skeleton w="w-28" /><Skeleton w="w-16" /></div>
              <Skeleton w="w-full" h="h-2" />
            </div>
          ))}
        </div>
      ) : err ? (
        <div className="px-5 py-6">
          <p className="text-sm font-medium mb-1" style={{ color: "#1a2333" }}>Call tracker unavailable</p>
          <p className="text-xs" style={{ color: "#ef4444" }}>{err}</p>
          <p className="text-xs mt-2" style={{ color: "#6b7a90" }}>
            This reads the call-center Google Sheet. Make sure the Google Sheets connection is authorized and the sheet is shared with the connected account.
          </p>
        </div>
      ) : !win || data?.totalCalls === 0 ? (
        <div className="px-5 py-6">
          <p className="text-xs" style={{ color: "#6b7a90" }}>No call data found in the tracker sheet yet.</p>
        </div>
      ) : (
        <div className="px-5 py-4 space-y-5">
          {/* KPI strip */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg px-3 py-2.5" style={{ backgroundColor: "#f8fafc", border: "1px solid #eef2f7" }}>
              <p className="text-[10px] font-semibold uppercase mb-1" style={{ color: "#6b7a90", letterSpacing: "0.5px" }}>Calls ({days}d)</p>
              <p className="text-2xl font-bold" style={{ color: "#1a2333" }}>{win.totalCalls}</p>
            </div>
            <div className="rounded-lg px-3 py-2.5" style={{ backgroundColor: "#f0fdf4", border: "1px solid #dcfce7" }}>
              <p className="text-[10px] font-semibold uppercase mb-1" style={{ color: "#15803d", letterSpacing: "0.5px" }}>Booked</p>
              <p className="text-2xl font-bold" style={{ color: "#15803d" }}>{win.totalBooked}</p>
            </div>
            <div className="rounded-lg px-3 py-2.5" style={{ backgroundColor: "#eff6ff", border: "1px solid #dbeafe" }}>
              <p className="text-[10px] font-semibold uppercase mb-1" style={{ color: "#1e40af", letterSpacing: "0.5px" }}>Conversion</p>
              <p className="text-2xl font-bold" style={{ color: "#1e40af" }}>{win.conversionRate}%</p>
            </div>
          </div>

          {/* top converting sources */}
          {topSet.size > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: "#a16207" }}>
                <Award className="w-3.5 h-3.5" /> Top converting:
              </span>
              {data?.topSources.map((s) => (
                <span key={s} className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: "#fefce8", color: "#854d0e", border: "1px solid #fde68a" }}>
                  {s}
                </span>
              ))}
            </div>
          )}

          {/* two-column: source breakdown + conversion-by-source chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* lead source breakdown */}
            <div>
              <p className="text-xs font-bold uppercase mb-3" style={{ color: "#6b7a90", letterSpacing: "0.5px" }}>
                Lead Source Breakdown
              </p>
              <div className="space-y-3">
                {win.sources.map((s, i) => {
                  const pct = win.totalCalls ? Math.round((s.calls / win.totalCalls) * 100) : 0;
                  const highlight = topSet.has(s.label);
                  return (
                    <div key={s.label}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium flex items-center gap-1" style={{ color: "#1a2333" }}>
                          {highlight && <Award className="w-3 h-3" style={{ color: "#eab308" }} />}
                          {s.label}
                        </span>
                        <span className="text-xs font-semibold" style={{ color: "#6b7a90" }}>
                          {s.calls} calls · {s.booked} booked · {s.conversionRate}%
                        </span>
                      </div>
                      <AnimatedBar pct={pct} color={sourceColor(i)} />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* conversion rate by source */}
            <div>
              <p className="text-xs font-bold uppercase mb-3" style={{ color: "#6b7a90", letterSpacing: "0.5px" }}>
                Conversion Rate by Source
              </p>
              <ResponsiveContainer width="100%" height={Math.max(160, win.sources.length * 34)}>
                <BarChart data={win.sources} layout="vertical" margin={{ top: 0, right: 24, bottom: 0, left: 8 }}>
                  <CartesianGrid horizontal={false} stroke="#f0f2f5" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "#94a3b8" }} unit="%" />
                  <YAxis type="category" dataKey="label" width={80} tick={{ fontSize: 11, fill: "#475569" }} />
                  <Tooltip formatter={(v: number) => [`${v}%`, "Conversion"]} cursor={{ fill: "#f8fafc" }} />
                  <Bar dataKey="conversionRate" radius={[0, 4, 4, 0]}>
                    {win.sources.map((s, i) => (
                      <Cell key={s.label} fill={topSet.has(s.label) ? "#eab308" : sourceColor(i)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* weekly call volume trend */}
          <div>
            <p className="flex items-center gap-1 text-xs font-bold uppercase mb-3" style={{ color: "#6b7a90", letterSpacing: "0.5px" }}>
              <TrendingUp className="w-3.5 h-3.5" /> Weekly Call Volume (last 12 weeks)
            </p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data?.weekly ?? []} margin={{ top: 0, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid vertical={false} stroke="#f0f2f5" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} interval={0} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
                <Tooltip cursor={{ fill: "#f8fafc" }} />
                <Bar dataKey="calls" name="Calls" fill="#cbd5e1" radius={[3, 3, 0, 0]} />
                <Bar dataKey="booked" name="Booked" fill="#2b4fac" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {data?.syncedAt && (
            <p className="text-[10px]" style={{ color: "#94a3b8" }}>
              Synced {new Date(data.syncedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} · {data.totalCalls} total calls in sheet
            </p>
          )}
        </div>
      )}
    </div>
  );
}
