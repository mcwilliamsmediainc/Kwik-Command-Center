import { Plus, Star, Briefcase, DollarSign, TrendingUp } from "lucide-react";

/* ─── Data ────────────────────────────────────────────────────── */
const TECHS = [
  {
    name: "Peyton", initials: "P", color: "#2b4fac",
    jobs: 18, revenue: "$3,240", pay: "$720", rating: "5.0",
  },
  {
    name: "Anthony", initials: "A", color: "#f97316",
    jobs: 15, revenue: "$2,740", pay: "$600", rating: "5.0",
  },
  {
    name: "Evan", initials: "E", color: "#3db54a",
    jobs: 13, revenue: "$2,260", pay: "$520", rating: "5.0",
  },
];

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

/* ─── Component ──────────────────────────────────────────────── */
export function TeamPayPage() {
  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase" style={{ color: "#6b7a90", letterSpacing: "0.6px" }}>May 2026</p>
        </div>
        <button className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-md"
          style={{ backgroundColor: "#2b4fac", color: "#fff" }}
          data-testid="button-add-technician">
          <Plus className="w-3.5 h-3.5" />Add Technician
        </button>
      </div>

      {/* Tech cards */}
      <div className="grid grid-cols-3 gap-5">
        {TECHS.map((t) => (
          <div key={t.name} className="bg-white rounded-xl overflow-hidden"
            style={{ border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", borderTop: `2px solid ${t.color}` }}>
            {/* Card header */}
            <div className="px-6 py-5 flex flex-col items-center" style={{ borderBottom: "1px solid #f0f0f0" }}>
              {/* Avatar */}
              <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-3"
                style={{ backgroundColor: t.color }}>
                {t.initials}
              </div>
              <p className="text-lg font-bold mb-1" style={{ color: "#1a2333" }}>{t.name}</p>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: "#f1f5f9", color: "#475569" }}>
                  1099 Contractor
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0" }}>
                  Active
                </span>
              </div>
            </div>

            {/* Stats */}
            <div className="px-6 py-2">
              <StatRow icon={Briefcase}   label="Jobs This Month"    value={`${t.jobs} jobs`} color={t.color} />
              <StatRow icon={TrendingUp}  label="Revenue Generated"  value={t.revenue}        color={t.color} />
              <StatRow icon={DollarSign}  label="Contractor Pay"     value={t.pay}            color={t.color} />
              <div className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ backgroundColor: `#eab30814` }}>
                    <Star className="w-3.5 h-3.5" style={{ color: "#eab308" }} />
                  </div>
                  <span className="text-sm" style={{ color: "#6b7a90" }}>Avg Rating</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-current" style={{ color: "#eab308" }} />
                  <span className="text-sm font-bold" style={{ color: "#1a2333" }}>{t.rating}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 pb-5">
              <button className="w-full py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80"
                style={{ backgroundColor: `${t.color}14`, color: t.color, border: `1px solid ${t.color}30` }}
                data-testid={`button-view-jobs-${t.name.toLowerCase()}`}>
                View Jobs →
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-5">
        {[
          { label: "Total Jobs Completed", value: "46", color: "#2b4fac" },
          { label: "Total Revenue Generated", value: "$8,240", color: "#3db54a" },
          { label: "Total Payroll Due", value: "$1,840", color: "#f97316" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-lg px-5 py-4 flex items-center justify-between"
            style={{ border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <p className="text-sm" style={{ color: "#6b7a90" }}>{s.label}</p>
            <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
