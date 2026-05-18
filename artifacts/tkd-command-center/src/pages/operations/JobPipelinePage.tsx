import { RefreshCw, CheckCircle, Clock, AlertCircle, Loader } from "lucide-react";

/* ─── Data ────────────────────────────────────────────────────── */
const KPIS = [
  { label: "Scheduled Today", value: "5", sub: "ready to go",       accent: "#2b4fac" },
  { label: "In Progress",     value: "2", sub: "currently running",  accent: "#f97316" },
  { label: "Completed Today", value: "3", sub: "jobs finished",      accent: "#3db54a" },
  { label: "Pending Confirm", value: "3", sub: "awaiting reply",     accent: "#eab308" },
];

type Status = "Complete" | "In Progress" | "Scheduled" | "Pending";

interface Job {
  time: string; customer: string; services: string;
  tech: string; location: string; value: string; status: Status;
}

const JOBS: Job[] = [
  { time: "8:00 AM",  customer: "Oakwood Apartments", services: "Carpet Cleaning · 4BR",       tech: "Peyton",  location: "Unit 4B, Oakwood",     value: "$280", status: "Complete"   },
  { time: "8:30 AM",  customer: "City Library",        services: "Upholstery · 6 pieces",      tech: "Anthony", location: "Main Branch",           value: "$320", status: "Complete"   },
  { time: "9:00 AM",  customer: "Sandra Williams",     services: "Sectional · L-shape",         tech: "Evan",    location: "1842 E 34th St",        value: "$165", status: "Complete"   },
  { time: "10:30 AM", customer: "River Creek HOA",     services: "Carpet Cleaning · Common",   tech: "Peyton",  location: "River Creek Clubhouse", value: "$420", status: "In Progress"},
  { time: "11:00 AM", customer: "Tom Harrison",        services: "Carpet + Air Ducts",          tech: "Anthony", location: "4410 S Peoria Ave",     value: "$375", status: "In Progress"},
  { time: "1:00 PM",  customer: "Lisa Monroe",         services: "Carpet 3BR + Air Ducts",     tech: "Evan",    location: "8811 S Harvard Ave",    value: "$390", status: "Scheduled"  },
  { time: "3:30 PM",  customer: "James Petrov",        services: "Sofa + Loveseat",            tech: "Peyton",  location: "312 W 6th St",          value: "$195", status: "Scheduled"  },
];

const STATUS_CONFIG: Record<Status, { bg: string; text: string; border: string; icon: typeof CheckCircle }> = {
  "Complete":    { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0", icon: CheckCircle  },
  "In Progress": { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa", icon: Loader       },
  "Scheduled":   { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe", icon: Clock        },
  "Pending":     { bg: "#fefce8", text: "#854d0e", border: "#fde68a", icon: AlertCircle  },
};

const TECH_COLORS: Record<string, string> = {
  Peyton: "#2b4fac", Anthony: "#f97316", Evan: "#3db54a",
};

/* ─── Component ──────────────────────────────────────────────── */
export function JobPipelinePage() {
  return (
    <div className="flex flex-col gap-4">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {KPIS.map((k) => (
          <div key={k.label} className="bg-white rounded-lg px-4 py-3.5"
            style={{ border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", borderTop: `2px solid ${k.accent}` }}>
            <p className="text-xs font-semibold uppercase mb-1" style={{ color: "#6b7a90", letterSpacing: "0.6px" }}>{k.label}</p>
            <p className="text-2xl font-bold tracking-tight mb-0.5" style={{ color: "#1a2333" }}>{k.value}</p>
            <p className="text-xs" style={{ color: "#6b7a90" }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg overflow-hidden"
        style={{ border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderBottom: "1px solid #f0f0f0" }}>
          <p className="text-sm font-bold" style={{ color: "#1a2333" }}>Today's Jobs — May 18, 2026</p>
          <button className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md"
            style={{ backgroundColor: "#eff6ff", color: "#2b4fac", border: "1px solid #bfdbfe" }}
            data-testid="button-sync-housecall">
            <RefreshCw className="w-3 h-3" />Sync HouseCall Pro
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid #f0f0f0", backgroundColor: "#fafafa" }}>
                {["Time", "Customer", "Services", "Technician", "Location", "Value", "Status"].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase"
                    style={{ color: "#6b7a90", letterSpacing: "0.5px" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {JOBS.map((j, idx) => {
                const sc = STATUS_CONFIG[j.status];
                const Icon = sc.icon;
                const techColor = TECH_COLORS[j.tech] ?? "#6b7a90";
                return (
                  <tr key={idx} style={{ borderBottom: "1px solid #f5f5f5" }}>
                    <td className="px-5 py-3.5 text-sm font-semibold tabular-nums" style={{ color: "#1a2333" }}>{j.time}</td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm font-semibold" style={{ color: "#1a2333" }}>{j.customer}</span>
                    </td>
                    <td className="px-5 py-3.5 text-xs" style={{ color: "#6b7a90" }}>{j.services}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                          style={{ backgroundColor: techColor }}>{j.tech[0]}</div>
                        <span className="text-sm" style={{ color: "#1a2333" }}>{j.tech}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs" style={{ color: "#6b7a90" }}>{j.location}</td>
                    <td className="px-5 py-3.5 text-sm font-bold" style={{ color: "#1a2333" }}>{j.value}</td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{ backgroundColor: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>
                        <Icon className="w-3 h-3" />{j.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: "1px solid #f0f0f0" }}>
          <p className="text-xs" style={{ color: "#6b7a90" }}>7 jobs · Total value: $2,145</p>
          <p className="text-xs" style={{ color: "#3db54a" }}>Last synced: 2 minutes ago</p>
        </div>
      </div>
    </div>
  );
}
