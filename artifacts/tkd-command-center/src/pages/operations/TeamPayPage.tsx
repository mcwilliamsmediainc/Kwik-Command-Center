import { useEffect, useState, useCallback } from "react";
import { Plus, Star, Briefcase, DollarSign, TrendingUp } from "lucide-react";

/* ─── Types ──────────────────────────────────────────────────── */
interface Tech {
  name: string; color: string; jobs: number; revenue: number; pay: number;
}
interface FinancialsData {
  techs: Tech[]; payrollTotal: number; totalRevenue: number; month: string;
}

/* ─── Helpers ────────────────────────────────────────────────── */
function fmt$(n: number) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}
function techColor(raw: string) {
  return raw.startsWith("#") ? raw : `#${raw}`;
}

/* ─── Fallback colors if HCP doesn't supply one ─────────────── */
const FALLBACK_COLORS = ["#2b4fac", "#f97316", "#3db54a", "#8b5cf6", "#ec4899", "#eab308"];

/* ─── StatRow ────────────────────────────────────────────────── */
interface StatRowProps { icon: typeof Briefcase; label: string; value: string; color: string }
function StatRow({ icon: Icon, label, value, color }: StatRowProps) {
  return (
    <div className="flex items-center justify-between py-2.5" style={{ borderBottom: "1px solid #f5f5f5" }}>
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ backgroundColor: `${color}14` }}>
          <Icon className="w-3.5 h-3.5" style={{ color }} />
        </div>
        <span className="text-sm" style={{ color: "#6b7a90" }}>{label}</span>
      </div>
      <span className="text-sm font-bold" style={{ color: "#1a2333" }}>{value}</span>
    </div>
  );
}

/* ─── Skeleton ───────────────────────────────────────────────── */
function Skeleton() {
  return (
    <div className="bg-white rounded-xl overflow-hidden" style={{ border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
      <div className="px-6 py-5 flex flex-col items-center" style={{ borderBottom: "1px solid #f0f0f0" }}>
        <div className="w-16 h-16 rounded-full mb-3 animate-pulse" style={{ backgroundColor: "#f0f0f0" }} />
        <div className="h-5 w-28 rounded animate-pulse mb-2" style={{ backgroundColor: "#f0f0f0" }} />
        <div className="h-4 w-36 rounded animate-pulse" style={{ backgroundColor: "#f0f0f0" }} />
      </div>
      <div className="px-6 py-4 space-y-3">
        {[1,2,3].map(i => <div key={i} className="h-4 rounded animate-pulse" style={{ backgroundColor: "#f0f0f0" }} />)}
      </div>
    </div>
  );
}

/* ─── Component ──────────────────────────────────────────────── */
export function TeamPayPage() {
  const [data,    setData]    = useState<FinancialsData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/hcp/financials");
      const json = await res.json() as FinancialsData & { error?: string };
      if (res.ok && !json.error) setData(json);
    } catch { /* non-fatal */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const techs        = data?.techs ?? [];
  const payrollTotal = data?.payrollTotal ?? 0;
  const totalRevenue = data?.totalRevenue ?? 0;
  const totalJobs    = techs.reduce((s, t) => s + t.jobs, 0);
  const month        = data?.month ?? "May 2026";

  return (
    <div className="flex flex-col gap-4 pb-10">

      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase" style={{ color: "#6b7a90", letterSpacing: "0.6px" }}>{month}</p>
        <button className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-md"
          style={{ backgroundColor: "#2b4fac", color: "#fff" }}
          data-testid="button-add-technician">
          <Plus className="w-3.5 h-3.5" />Add Technician
        </button>
      </div>

      {/* Tech cards — Fix: single column on mobile */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
        {loading
          ? [1,2,3].map(i => <Skeleton key={i} />)
          : techs.length === 0
          ? <p className="col-span-3 text-sm text-center py-8" style={{ color: "#6b7a90" }}>No technician data found for this month.</p>
          : techs.map((t, i) => {
              const color = t.color && t.color !== "ffffff" ? techColor(t.color) : FALLBACK_COLORS[i % FALLBACK_COLORS.length];
              return (
                <div key={t.name} className="bg-white rounded-xl overflow-hidden"
                  style={{ border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", borderTop: `2px solid ${color}` }}>
                  {/* Card header — avatar 48px on mobile, 64px on desktop, centered */}
                  <div className="px-5 py-5 md:px-6 flex flex-col items-center" style={{ borderBottom: "1px solid #f0f0f0" }}>
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center text-white text-xl md:text-2xl font-bold mb-3"
                      style={{ backgroundColor: color }}>
                      {initials(t.name)}
                    </div>
                    <p className="text-lg font-bold mb-1 text-center" style={{ color: "#1a2333" }}>{t.name}</p>
                    <div className="flex items-center gap-2 flex-wrap justify-center">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: "#f1f5f9", color: "#475569" }}>
                        1099 Contractor
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0" }}>
                        Active
                      </span>
                    </div>
                  </div>

                  {/* Stats — full width label/value rows */}
                  <div className="px-5 py-2 md:px-6">
                    <StatRow icon={Briefcase}  label="Jobs This Month"   value={`${t.jobs} jobs`} color={color} />
                    <StatRow icon={TrendingUp} label="Revenue Generated" value={fmt$(t.revenue)}  color={color} />
                    <StatRow icon={DollarSign} label="Contractor Pay"    value={fmt$(t.pay)}      color={color} />
                    <div className="flex items-center justify-between py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ backgroundColor: "#eab30814" }}>
                          <Star className="w-3.5 h-3.5" style={{ color: "#eab308" }} />
                        </div>
                        <span className="text-sm" style={{ color: "#6b7a90" }}>Pay Rate</span>
                      </div>
                      <span className="text-sm font-bold" style={{ color: "#1a2333" }}>$40 / job</span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="px-5 pb-5 md:px-6">
                    <button className="w-full py-2.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80"
                      style={{ backgroundColor: `${color}14`, color, border: `1px solid ${color}30` }}
                      data-testid={`button-view-jobs-${t.name.toLowerCase().replace(/\s+/g, "-")}`}>
                      View Jobs →
                    </button>
                  </div>
                </div>
              );
            })
        }
      </div>

      {/* Summary row — single column on mobile */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-5">
        {[
          { label: "Total Jobs Completed",    value: loading ? "—" : String(totalJobs),    color: "#2b4fac" },
          { label: "Total Revenue Generated", value: loading ? "—" : fmt$(totalRevenue),   color: "#3db54a" },
          { label: "Total Payroll Due",       value: loading ? "—" : fmt$(payrollTotal),   color: "#f97316" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-lg px-5 py-4 flex items-center justify-between"
            style={{ border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <p className="text-sm" style={{ color: "#6b7a90" }}>{s.label}</p>
            <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Process Payroll */}
      <div className="flex justify-end">
        <button className="flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-lg"
          style={{ backgroundColor: "#3db54a", color: "#fff" }}
          data-testid="button-process-payroll">
          <DollarSign className="w-4 h-4" />
          Process Payroll — {loading ? "…" : fmt$(payrollTotal)}
        </button>
      </div>
    </div>
  );
}
