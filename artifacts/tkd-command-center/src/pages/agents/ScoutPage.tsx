import { useEffect, useState } from "react";
import { Star, ExternalLink, ArrowUpRight } from "lucide-react";

/* ─── KPI data ───────────────────────────────────────────────── */
const KPIS = [
  {
    label: "Google Rating",
    value: "5.0★",
    sub1: "506 reviews",
    sub2: "↑3 this week",
    accent: "#eab308",
    textColor: "#854d0e",
    bgColor: "#fefce8",
  },
  {
    label: "Ad Spend MTD",
    value: "$450",
    sub1: "Google Ads",
    sub2: "$12.40/lead",
    accent: "#2b4fac",
    textColor: "#1e40af",
    bgColor: "#eff6ff",
  },
  {
    label: "Email Open Rate",
    value: "34%",
    sub1: "312 sent",
    sub2: "3 replies in pipeline",
    accent: "#3db54a",
    textColor: "#15803d",
    bgColor: "#f0fdf4",
  },
  {
    label: "Review Requests",
    value: "3 today",
    sub1: "47% conversion rate",
    sub2: "",
    accent: "#f97316",
    textColor: "#c2410c",
    bgColor: "#fff7ed",
  },
];

/* ─── Lead sources ───────────────────────────────────────────── */
const SOURCES = [
  { label: "Google Search",   pct: 42, jobs: 20, color: "#2b4fac" },
  { label: "Repeat Customer", pct: 28, jobs: 13, color: "#3db54a" },
  { label: "Referral",        pct: 16, jobs: 8,  color: "#f97316" },
  { label: "Facebook",        pct: 8,  jobs: 4,  color: "#2563eb" },
  { label: "Other",           pct: 6,  jobs: 2,  color: "#94a3b8" },
];

/* ─── Platform health ────────────────────────────────────────── */
const PLATFORMS = [
  { name: "Google",    pct: 100, barColor: "#2b4fac", badge: null,             badgeText: "506 reviews" },
  { name: "Birdeye",   pct: 95,  barColor: "#3db54a", badge: null,             badgeText: "5.0 ★" },
  { name: "Yelp",      pct: 20,  barColor: "#ef4444", badge: "needs-fix",      badgeText: "Needs Fix" },
  { name: "BBB",       pct: 55,  barColor: "#eab308", badge: "not-accredited", badgeText: "Not Accredited" },
  { name: "Facebook",  pct: 45,  barColor: "#2563eb", badge: "active",         badgeText: "Active" },
  { name: "Instagram", pct: 30,  barColor: "#ec4899", badge: "active",         badgeText: "Active" },
];

/* ─── Reviews ────────────────────────────────────────────────── */
const REVIEWS = [
  {
    stars: 5,
    text: "Best carpet cleaning in Tulsa. Peyton was on time and my carpets dried in under an hour.",
    author: "Michael T.",
    platform: "Google",
    when: "2 hours ago",
  },
  {
    stars: 5,
    text: "Evan did an amazing job on our air ducts. You could really feel the difference right away.",
    author: "Jennifer R.",
    platform: "Google",
    when: "Yesterday",
  },
  {
    stars: 5,
    text: "Anthony cleaned our sectional and it looks brand new. No harsh smell, dried so fast. No hidden fees.",
    author: "David K.",
    platform: "Google",
    when: "2 days ago",
  },
];

/* ─── Badge helper ───────────────────────────────────────────── */
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

/* ─── Stars ──────────────────────────────────────────────────── */
function Stars({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <Star key={i} className="w-3.5 h-3.5 fill-current" style={{ color: "#eab308" }} />
      ))}
    </div>
  );
}

/* ─── Animated bar ───────────────────────────────────────────── */
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
        style={{
          width: `${width}%`,
          backgroundColor: color,
          transition: "width 0.7s cubic-bezier(0.34,1.12,0.64,1)",
        }}
      />
    </div>
  );
}

/* ─── Component ──────────────────────────────────────────────── */
export function ScoutPage() {
  return (
    <div className="flex flex-col gap-4">

      {/* ── KPI row ── */}
      <div className="grid grid-cols-4 gap-4">
        {KPIS.map((k) => (
          <div
            key={k.label}
            className="bg-white rounded-lg px-4 py-3.5"
            style={{
              border: "1px solid rgba(0,0,0,0.07)",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              borderTop: `2px solid ${k.accent}`,
            }}
          >
            <p className="text-xs font-semibold uppercase mb-1.5" style={{ color: "#6b7a90", letterSpacing: "0.6px" }}>
              {k.label}
            </p>
            <p className="text-2xl font-bold tracking-tight mb-1" style={{ color: "#1a2333" }}>
              {k.value}
            </p>
            <p className="text-xs" style={{ color: "#6b7a90" }}>{k.sub1}</p>
            {k.sub2 && (
              <p className="text-xs font-semibold mt-0.5" style={{ color: k.textColor }}>
                {k.sub2}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* ── Two-column mid section ── */}
      <div className="grid grid-cols-2 gap-4">

        {/* Lead Sources */}
        <div
          className="bg-white rounded-lg overflow-hidden"
          style={{ border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
        >
          <div
            className="px-5 py-3.5 flex items-center justify-between"
            style={{ borderBottom: "1px solid #f0f0f0" }}
          >
            <p className="text-sm font-bold" style={{ color: "#1a2333" }}>
              Lead Sources — May
            </p>
            <a
              href="#"
              className="text-xs font-medium flex items-center gap-1 hover:underline"
              style={{ color: "#2b4fac" }}
            >
              HouseCall Pro <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className="px-5 py-4 space-y-5">
            {SOURCES.map((s) => (
              <div key={s.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium" style={{ color: "#1a2333" }}>{s.label}</span>
                  <span className="text-xs font-semibold" style={{ color: "#6b7a90" }}>
                    {s.jobs} jobs · {s.pct}%
                  </span>
                </div>
                <AnimatedBar pct={s.pct} color={s.color} />
              </div>
            ))}
          </div>
        </div>

        {/* Platform Health */}
        <div
          className="bg-white rounded-lg overflow-hidden"
          style={{ border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
        >
          <div
            className="px-5 py-3.5"
            style={{ borderBottom: "1px solid #f0f0f0" }}
          >
            <p className="text-sm font-bold" style={{ color: "#1a2333" }}>Platform Health</p>
          </div>
          <div className="px-5 py-4 space-y-4">
            {PLATFORMS.map((p) => (
              <div key={p.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium" style={{ color: "#1a2333" }}>{p.name}</span>
                  <PlatformBadge type={p.badge} text={p.badgeText} />
                </div>
                <div className="w-full rounded-full overflow-hidden" style={{ height: "6px", backgroundColor: "#f0f2f5" }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${p.pct}%`, backgroundColor: p.barColor }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Recent Reviews — full width ── */}
      <div
        className="bg-white rounded-lg overflow-hidden"
        style={{ border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
      >
        <div
          className="px-5 py-3.5 flex items-center justify-between"
          style={{ borderBottom: "1px solid #f0f0f0" }}
        >
          <p className="text-sm font-bold" style={{ color: "#1a2333" }}>
            Recent Reviews — Needs Response
          </p>
          <a
            href="#"
            className="text-xs font-medium flex items-center gap-1 hover:underline"
            style={{ color: "#2b4fac" }}
          >
            View all 506 <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </div>
        <div className="grid grid-cols-3 divide-x divide-gray-100">
          {REVIEWS.map((r) => (
            <div key={r.author} className="px-5 py-4 flex flex-col gap-3">
              <Stars count={r.stars} />
              <p className="text-sm leading-relaxed flex-1" style={{ color: "#374151" }}>
                "{r.text}"
              </p>
              <div>
                <p className="text-xs font-semibold" style={{ color: "#1a2333" }}>{r.author}</p>
                <p className="text-xs" style={{ color: "#6b7a90" }}>
                  {r.platform} · {r.when}
                </p>
              </div>
              <button
                className="self-start text-xs font-semibold px-3 py-1.5 rounded-md transition-colors hover:opacity-80"
                style={{ backgroundColor: "#eff6ff", color: "#2b4fac", border: "1px solid #bfdbfe" }}
                data-testid={`button-respond-${r.author.toLowerCase().replace(/\s+/g, "-").replace(".", "")}`}
              >
                Respond →
              </button>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
