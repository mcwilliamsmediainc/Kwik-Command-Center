import { useState, useEffect, useCallback } from "react";
import { Search, Users, DollarSign, Clock, FileText, RefreshCw, WifiOff } from "lucide-react";

/* ─── Types ────────────────────────────────────────────────────── */
type DormantStatus = "Active" | "Dormant 3mo" | "Dormant 6mo" | "Dormant 1yr+" | "No Jobs";

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  lastJobDate: string;
  lastJobService: string;
  jobCount: number;
  totalSpent: number;
  status: DormantStatus;
  daysSince: number | null;
}

interface CustomersResponse {
  customers: Customer[];
  total_items: number;
  estimates_count: number;
  dormant_365: number;
  avg_ltv: number;
  syncedAt: string;
  error?: string;
}

/* ─── Status config ─────────────────────────────────────────────── */
const STATUS_CONFIG: Record<DormantStatus, { bg: string; text: string; border: string }> = {
  "Active":       { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" },
  "Dormant 3mo":  { bg: "#fefce8", text: "#854d0e", border: "#fde68a" },
  "Dormant 6mo":  { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" },
  "Dormant 1yr+": { bg: "#fef2f2", text: "#b91c1c", border: "#fecaca" },
  "No Jobs":      { bg: "#f9fafb", text: "#6b7a90", border: "#e5e7eb" },
};

/* ─── Helpers ───────────────────────────────────────────────────── */
function fmtPhone(p: string) { return p || "—"; }
function fmtCurrency(n: number) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function fmtDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/Chicago" });
}
function fmtSynced(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true });
}
function avatarColor(name: string) {
  const colors = ["#2b4fac", "#3db54a", "#f97316", "#7c3aed", "#0891b2", "#be185d"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return colors[h % colors.length];
}

/* ─── Component ─────────────────────────────────────────────────── */
export function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [meta, setMeta]           = useState({ total_items: 0, estimates_count: 0, dormant_365: 0, avg_ltv: 0 });
  const [syncedAt, setSyncedAt]   = useState("");
  const [loading, setLoading]     = useState(true);
  const [syncing, setSyncing]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [search, setSearch]       = useState("");

  const fetchCustomers = useCallback(async (isManual = false) => {
    if (isManual) setSyncing(true); else setLoading(true);
    setError(null);
    try {
      const res  = await fetch("/api/hcp/customers");
      const data: CustomersResponse = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Server error ${res.status}`);
      setCustomers(data.customers);
      setMeta({ total_items: data.total_items, estimates_count: data.estimates_count, dormant_365: data.dormant_365, avg_ltv: data.avg_ltv });
      setSyncedAt(data.syncedAt);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load customers");
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, []);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.email ?? "").toLowerCase().includes(q) ||
      (c.city ?? "").toLowerCase().includes(q)
    );
  });

  const KPIS = [
    { label: "Total Customers",  value: loading ? "—" : meta.total_items.toLocaleString(), sub: "in HouseCall Pro",      accent: "#2b4fac", Icon: Users       },
    { label: "Avg Lifetime Value", value: loading ? "—" : fmtCurrency(meta.avg_ltv),         sub: "per customer",          accent: "#3db54a", Icon: DollarSign  },
    { label: "Dormant 12mo+",    value: loading ? "—" : String(meta.dormant_365),           sub: "need reactivation",      accent: "#f97316", Icon: Clock       },
    { label: "Open Quotes",      value: loading ? "—" : String(meta.estimates_count),        sub: "awaiting response",      accent: "#eab308", Icon: FileText    },
  ];

  return (
    <div className="flex flex-col gap-4">

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {KPIS.map(({ label, value, sub, accent, Icon }) => (
          <div key={label} className="bg-white rounded-lg px-4 py-3.5"
            style={{ border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", borderTop: `2px solid ${accent}` }}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase mb-1" style={{ color: "#6b7a90", letterSpacing: "0.6px" }}>{label}</p>
                {loading
                  ? <div className="h-7 w-16 rounded bg-gray-100 animate-pulse mb-0.5" />
                  : <p className="text-2xl font-bold tracking-tight mb-0.5" style={{ color: "#1a2333" }}>{value}</p>}
                <p className="text-xs" style={{ color: "#6b7a90" }}>{sub}</p>
              </div>
              <div className="p-2 rounded-lg" style={{ backgroundColor: `${accent}14` }}>
                <Icon className="w-4 h-4" style={{ color: accent }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div className="bg-white rounded-lg overflow-hidden"
        style={{ border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>

        {/* Toolbar */}
        <div className="px-5 py-3.5 flex items-center gap-3" style={{ borderBottom: "1px solid #f0f0f0" }}>
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "#6b7a90" }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, phone, or city…"
              className="w-full pl-9 pr-4 py-2 text-sm rounded-md outline-none"
              style={{ border: "1px solid #e4e8f0", backgroundColor: "#f9fafb", color: "#1a2333" }}
              data-testid="input-customer-search"
            />
          </div>
          {!loading && (
            <span className="text-xs" style={{ color: "#6b7a90" }}>
              {filtered.length} of {customers.length} shown
            </span>
          )}
          <button
            onClick={() => fetchCustomers(true)}
            disabled={syncing}
            className="ml-auto flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition-opacity disabled:opacity-60"
            style={{ backgroundColor: "#eff6ff", color: "#2b4fac", border: "1px solid #bfdbfe" }}>
            <RefreshCw className={`w-3 h-3 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing…" : "Sync"}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-5 my-4 flex items-start gap-3 p-4 rounded-lg"
            style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca" }}>
            <WifiOff className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#dc2626" }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: "#991b1b" }}>Couldn't reach HouseCall Pro</p>
              <p className="text-xs mt-0.5" style={{ color: "#b91c1c" }}>{error}</p>
            </div>
          </div>
        )}

        {/* Skeleton */}
        {loading && !error && (
          <div className="p-5 space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-10 rounded bg-gray-50 animate-pulse" />
            ))}
          </div>
        )}

        {/* Table */}
        {!loading && !error && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid #f0f0f0", backgroundColor: "#fafafa" }}>
                  {[
                    { label: "Customer",      style: { minWidth: 180 } },
                    { label: "Phone",         style: { minWidth: 130 } },
                    { label: "Last Job",      style: { minWidth: 180 } },
                    { label: "Jobs",          style: { minWidth: 60  } },
                    { label: "Lifetime Value",style: { minWidth: 110 } },
                    { label: "Status",        style: { minWidth: 120 } },
                    { label: "",              style: { minWidth: 70  } },
                  ].map(({ label, style }) => (
                    <th key={label} className="px-5 py-3 text-left text-xs font-semibold uppercase"
                      style={{ color: "#6b7a90", letterSpacing: "0.5px", ...style }}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-sm" style={{ color: "#6b7a90" }}>
                      {search ? "No customers match your search." : "No customers found."}
                    </td>
                  </tr>
                )}
                {filtered.map((c) => {
                  const sc = STATUS_CONFIG[c.status as DormantStatus] ?? STATUS_CONFIG["No Jobs"];
                  const color = avatarColor(c.name);
                  return (
                    <tr key={c.id} className="group" style={{ borderBottom: "1px solid #f5f5f5" }}>
                      {/* Customer */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                            style={{ backgroundColor: color }}>{c.name[0] ?? "?"}</div>
                          <div className="min-w-0">
                            <span className="block font-semibold text-sm truncate" style={{ color: "#1a2333" }}>{c.name}</span>
                            <span className="block text-[11px]" style={{ color: "#9ca3af" }}>{c.city || c.id.slice(0, 12)}</span>
                          </div>
                        </div>
                      </td>
                      {/* Phone */}
                      <td className="px-5 py-3.5 text-sm" style={{ color: "#6b7a90" }}>{fmtPhone(c.phone)}</td>
                      {/* Last job */}
                      <td className="px-5 py-3.5">
                        <span className="block text-xs font-medium" style={{ color: "#1a2333" }}>
                          {c.lastJobService ? (c.lastJobService.length > 32 ? c.lastJobService.slice(0, 32) + "…" : c.lastJobService) : "—"}
                        </span>
                        <span className="block text-[11px] mt-0.5" style={{ color: "#9ca3af" }}>{fmtDate(c.lastJobDate)}</span>
                      </td>
                      {/* Jobs count */}
                      <td className="px-5 py-3.5 text-sm font-semibold" style={{ color: "#1a2333" }}>
                        {c.jobCount || "—"}
                      </td>
                      {/* LTV */}
                      <td className="px-5 py-3.5 text-sm font-semibold" style={{ color: "#1a2333" }}>
                        {c.totalSpent > 0 ? fmtCurrency(c.totalSpent) : "—"}
                      </td>
                      {/* Status */}
                      <td className="px-5 py-3.5">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                          style={{ backgroundColor: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>
                          {c.status}
                        </span>
                      </td>
                      {/* Action */}
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
        )}

        {/* Footer */}
        {!loading && !error && (
          <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: "1px solid #f0f0f0" }}>
            <p className="text-xs" style={{ color: "#6b7a90" }}>
              Showing {customers.length} of {meta.total_items.toLocaleString()} customers
            </p>
            {syncedAt && (
              <p className="text-xs" style={{ color: "#3db54a" }}>Last synced: {fmtSynced(syncedAt)}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
