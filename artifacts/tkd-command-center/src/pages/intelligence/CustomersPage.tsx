import { useState } from "react";
import { Search, Users, DollarSign, Clock, FileText } from "lucide-react";

/* ─── Data ────────────────────────────────────────────────────── */
const KPIS = [
  { label: "Total Customers", value: "247",   sub: "in your database",       accent: "#2b4fac" },
  { label: "Avg LTV",         value: "$342",  sub: "lifetime value",          accent: "#3db54a" },
  { label: "Dormant 12mo+",   value: "31",    sub: "need reactivation",       accent: "#f97316" },
  { label: "Open Quotes",     value: "6",     sub: "awaiting response",       accent: "#eab308" },
];

const KPI_ICONS = [Users, DollarSign, Clock, FileText];

interface Customer {
  name: string; phone: string; lastJob: string;
  jobs: number; ltv: string; tech: string;
  status: "Active" | "Dormant 4mo" | "Dormant 6mo" | "Quote Open" | "Dormant 3yr";
}

const CUSTOMERS: Customer[] = [
  { name: "Sandra Williams", phone: "(918) 441-7823", lastJob: "Mar 15, 2026", jobs: 4, ltv: "$847", tech: "Peyton", status: "Active" },
  { name: "Tom Harrison",    phone: "(918) 552-0194", lastJob: "Apr 2, 2026",  jobs: 2, ltv: "$312", tech: "Anthony", status: "Dormant 4mo" },
  { name: "Lisa Monroe",     phone: "(918) 337-4401", lastJob: "Dec 1, 2025",  jobs: 1, ltv: "$195", tech: "Evan",    status: "Dormant 6mo" },
  { name: "James Petrov",    phone: "(918) 209-5513", lastJob: "Pending",      jobs: 0, ltv: "—",    tech: "—",       status: "Quote Open" },
  { name: "Michael Chen",    phone: "(918) 555-2241", lastJob: "Mar 12, 2023", jobs: 3, ltv: "$520", tech: "Peyton", status: "Dormant 3yr" },
];

const STATUS_STYLE: Record<Customer["status"], { bg: string; text: string; border: string }> = {
  "Active":       { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" },
  "Dormant 4mo":  { bg: "#fefce8", text: "#854d0e", border: "#fde68a" },
  "Dormant 6mo":  { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" },
  "Quote Open":   { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  "Dormant 3yr":  { bg: "#fef2f2", text: "#b91c1c", border: "#fecaca" },
};

/* ─── Component ──────────────────────────────────────────────── */
export function CustomersPage() {
  const [search, setSearch] = useState("");

  const filtered = CUSTOMERS.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search) ||
    c.status.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-4">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {KPIS.map((k, i) => {
          const Icon = KPI_ICONS[i];
          return (
            <div key={k.label} className="bg-white rounded-lg px-4 py-3.5"
              style={{ border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", borderTop: `2px solid ${k.accent}` }}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase mb-1" style={{ color: "#6b7a90", letterSpacing: "0.6px" }}>{k.label}</p>
                  <p className="text-2xl font-bold tracking-tight mb-0.5" style={{ color: "#1a2333" }}>{k.value}</p>
                  <p className="text-xs" style={{ color: "#6b7a90" }}>{k.sub}</p>
                </div>
                <div className="p-2 rounded-lg" style={{ backgroundColor: `${k.accent}14` }}>
                  <Icon className="w-4 h-4" style={{ color: k.accent }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg overflow-hidden"
        style={{ border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        {/* Search bar */}
        <div className="px-5 py-3.5 flex items-center gap-3" style={{ borderBottom: "1px solid #f0f0f0" }}>
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "#6b7a90" }} />
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, phone, or status..."
              className="w-full pl-9 pr-4 py-2 text-sm rounded-md outline-none"
              style={{ border: "1px solid #e4e8f0", backgroundColor: "#f9fafb", color: "#1a2333" }}
              data-testid="input-customer-search"
            />
          </div>
          <span className="text-xs ml-auto" style={{ color: "#6b7a90" }}>
            {filtered.length} of {CUSTOMERS.length} customers
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid #f0f0f0" }}>
                {["Customer", "Phone", "Last Job", "Jobs", "LTV", "Preferred Tech", "Status", "Action"].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase"
                    style={{ color: "#6b7a90", letterSpacing: "0.5px", backgroundColor: "#fafafa" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const s = STATUS_STYLE[c.status];
                return (
                  <tr key={c.name} className="group" style={{ borderBottom: "1px solid #f5f5f5" }}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ backgroundColor: "#2b4fac" }}>{c.name[0]}</div>
                        <span className="font-semibold text-sm" style={{ color: "#1a2333" }}>{c.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm" style={{ color: "#6b7a90" }}>{c.phone}</td>
                    <td className="px-5 py-3.5 text-sm" style={{ color: "#6b7a90" }}>{c.lastJob}</td>
                    <td className="px-5 py-3.5 text-sm font-semibold" style={{ color: "#1a2333" }}>{c.jobs}</td>
                    <td className="px-5 py-3.5 text-sm font-semibold" style={{ color: "#1a2333" }}>{c.ltv}</td>
                    <td className="px-5 py-3.5 text-sm" style={{ color: "#6b7a90" }}>{c.tech}</td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-semibold px-2 py-1 rounded-full"
                        style={{ backgroundColor: s.bg, color: s.text, border: `1px solid ${s.border}` }}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <button className="text-xs font-semibold px-3 py-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ backgroundColor: "#eff6ff", color: "#2b4fac", border: "1px solid #bfdbfe" }}>
                        View →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
