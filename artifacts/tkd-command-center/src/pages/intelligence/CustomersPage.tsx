import { useState, useEffect, useCallback } from "react";
import { Search, Users, DollarSign, Clock, FileText, RefreshCw, WifiOff, ChevronLeft, ChevronRight } from "lucide-react";

/* ─── Types ────────────────────────────────────────────────────── */
type DormantStatus = "Active" | "Dormant 3mo" | "Dormant 6mo" | "Dormant 1yr+" | "No Jobs";
type FilterStatus  = "All" | "Active" | "Dormant" | "No Jobs";

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

/* ─── Config ────────────────────────────────────────────────────── */
const PAGE_SIZE = 25;

const STATUS_CONFIG: Record<DormantStatus, { bg: string; text: string; border: string }> = {
  "Active":       { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" },
  "Dormant 3mo":  { bg: "#fefce8", text: "#854d0e", border: "#fde68a" },
  "Dormant 6mo":  { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" },
  "Dormant 1yr+": { bg: "#fef2f2", text: "#b91c1c", border: "#fecaca" },
  "No Jobs":      { bg: "#f9fafb", text: "#6b7a90", border: "#e5e7eb" },
};

const FILTER_OPTIONS: FilterStatus[] = ["All", "Active", "Dormant", "No Jobs"];

/* ─── Helpers ───────────────────────────────────────────────────── */
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
function matchesFilter(status: DormantStatus, f: FilterStatus) {
  if (f === "All")    return true;
  if (f === "Active") return status === "Active";
  if (f === "No Jobs") return status === "No Jobs";
  if (f === "Dormant") return status.startsWith("Dormant");
  return true;
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
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("All");
  const [page, setPage]           = useState(1);

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
      setPage(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load customers");
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, []);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  // Reset to page 1 when search/filter changes
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch =
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.email ?? "").toLowerCase().includes(q) ||
      (c.city ?? "").toLowerCase().includes(q);
    return matchSearch && matchesFilter(c.status as DormantStatus, statusFilter);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const pageStart  = (safePage - 1) * PAGE_SIZE;
  const pageRows   = filtered.slice(pageStart, pageStart + PAGE_SIZE);
  const showFrom   = filtered.length === 0 ? 0 : pageStart + 1;
  const showTo     = Math.min(pageStart + PAGE_SIZE, filtered.length);

  const KPIS = [
    { label: "Total Customers",   value: loading ? "—" : meta.total_items.toLocaleString(), sub: "in HouseCall Pro",   accent: "#2b4fac", Icon: Users       },
    { label: "Avg Lifetime Value", value: loading ? "—" : fmtCurrency(meta.avg_ltv),         sub: "per customer",       accent: "#3db54a", Icon: DollarSign  },
    { label: "Dormant 12mo+",     value: loading ? "—" : String(meta.dormant_365),           sub: "need reactivation",  accent: "#f97316", Icon: Clock       },
    { label: "Open Quotes",       value: loading ? "—" : String(meta.estimates_count),        sub: "awaiting response",  accent: "#eab308", Icon: FileText    },
  ];

  return (
    <div className="flex flex-col gap-4">

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
        {KPIS.map(({ label, value, sub, accent, Icon }) => (
          <div key={label} className="bg-white rounded-lg px-3 py-3 md:px-4 md:py-3.5"
            style={{ border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", borderTop: `2px solid ${accent}` }}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[9px] md:text-xs font-semibold uppercase mb-1" style={{ color: "#6b7a90", letterSpacing: "0.6px" }}>{label}</p>
                {loading
                  ? <div className="h-7 w-16 rounded bg-gray-100 animate-pulse mb-0.5" />
                  : <p className="text-2xl font-bold tracking-tight mb-0.5" style={{ color: "#1a2333" }}>{value}</p>}
                <p className="text-[10px] md:text-xs" style={{ color: "#6b7a90" }}>{sub}</p>
              </div>
              <div className="p-1.5 md:p-2 rounded-lg" style={{ backgroundColor: `${accent}14` }}>
                <Icon className="w-3.5 h-3.5 md:w-4 md:h-4" style={{ color: accent }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div className="bg-white rounded-lg overflow-hidden"
        style={{ border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>

        {/* Toolbar */}
        <div className="px-5 py-3.5 flex items-center gap-3 flex-wrap" style={{ borderBottom: "1px solid #f0f0f0" }}>
          {/* Search */}
          <div className="relative flex-1 md:flex-none" style={{ minWidth: 0 }}>
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
          {/* Status filter */}
          <div className="flex items-center gap-1.5 rounded-md overflow-hidden" style={{ border: "1px solid #e4e8f0" }}>
            {FILTER_OPTIONS.map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className="px-3 py-1.5 text-xs font-semibold transition-colors"
                style={{
                  backgroundColor: statusFilter === f ? "#2b4fac" : "transparent",
                  color: statusFilter === f ? "#fff" : "#6b7a90",
                }}>
                {f}
              </button>
            ))}
          </div>
          {!loading && (
            <span className="text-xs" style={{ color: "#6b7a90" }}>
              {filtered.length} matching
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
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-10 rounded bg-gray-50 animate-pulse" />
            ))}
          </div>
        )}

        {/* Mobile card list — shown only on small screens */}
        {!loading && !error && (
          <div className="md:hidden divide-y divide-gray-50">
            {pageRows.length === 0 && (
              <div className="px-5 py-10 text-center text-sm" style={{ color: "#6b7a90" }}>
                {search || statusFilter !== "All" ? "No customers match your filters." : "No customers found."}
              </div>
            )}
            {pageRows.map((c) => {
              const sc    = STATUS_CONFIG[c.status as DormantStatus] ?? STATUS_CONFIG["No Jobs"];
              const color = avatarColor(c.name);
              return (
                <div key={c.id} className="px-4 py-3.5 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-bold mt-0.5"
                    style={{ backgroundColor: color }}>{c.name[0] ?? "?"}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="font-semibold text-sm" style={{ color: "#1a2333" }}>{c.name}</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>
                        {c.status}
                      </span>
                    </div>
                    <p className="text-xs mb-1" style={{ color: "#6b7a90" }}>
                      {c.phone || "—"} · {c.city || "—"}
                    </p>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xs" style={{ color: "#6b7a90" }}>
                        {c.jobCount || 0} jobs
                      </span>
                      {c.totalSpent > 0 && (
                        <span className="text-xs font-semibold" style={{ color: "#2b4fac" }}>
                          {fmtCurrency(c.totalSpent)} LTV
                        </span>
                      )}
                      {c.lastJobDate && (
                        <span className="text-xs" style={{ color: "#9ca3af" }}>
                          Last: {fmtDate(c.lastJobDate)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Desktop table — hidden on mobile */}
        {!loading && !error && (
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid #f0f0f0", backgroundColor: "#fafafa" }}>
                  {[
                    { label: "Customer",       style: { minWidth: 180 } },
                    { label: "Phone",          style: { minWidth: 130 } },
                    { label: "Last Job",       style: { minWidth: 180 } },
                    { label: "Jobs",           style: { minWidth: 55  } },
                    { label: "Lifetime Value", style: { minWidth: 110 } },
                    { label: "Status",         style: { minWidth: 120 } },
                    { label: "",               style: { minWidth: 70  } },
                  ].map(({ label, style }) => (
                    <th key={label} className="px-5 py-3 text-left text-xs font-semibold uppercase"
                      style={{ color: "#6b7a90", letterSpacing: "0.5px", ...style }}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-sm" style={{ color: "#6b7a90" }}>
                      {search || statusFilter !== "All" ? "No customers match your filters." : "No customers found."}
                    </td>
                  </tr>
                )}
                {pageRows.map((c) => {
                  const sc = STATUS_CONFIG[c.status as DormantStatus] ?? STATUS_CONFIG["No Jobs"];
                  const color = avatarColor(c.name);
                  return (
                    <tr key={c.id} className="group" style={{ borderBottom: "1px solid #f5f5f5" }}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                            style={{ backgroundColor: color }}>{c.name[0] ?? "?"}</div>
                          <div className="min-w-0">
                            <span className="block font-semibold text-sm truncate" style={{ color: "#1a2333" }}>{c.name}</span>
                            <span className="block text-[11px]" style={{ color: "#9ca3af" }}>{c.city || "—"}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm" style={{ color: "#6b7a90" }}>{c.phone || "—"}</td>
                      <td className="px-5 py-3.5">
                        <span className="block text-xs font-medium" style={{ color: "#1a2333" }}>
                          {c.lastJobService ? (c.lastJobService.length > 32 ? c.lastJobService.slice(0, 32) + "…" : c.lastJobService) : "—"}
                        </span>
                        <span className="block text-[11px] mt-0.5" style={{ color: "#9ca3af" }}>{fmtDate(c.lastJobDate)}</span>
                      </td>
                      <td className="px-5 py-3.5 text-sm font-semibold" style={{ color: "#1a2333" }}>
                        {c.jobCount || "—"}
                      </td>
                      <td className="px-5 py-3.5 text-sm font-semibold" style={{ color: "#1a2333" }}>
                        {c.totalSpent > 0 ? fmtCurrency(c.totalSpent) : "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                          style={{ backgroundColor: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>
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
        )}

        {/* Pagination footer */}
        {!loading && !error && (
          <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: "1px solid #f0f0f0" }}>
            <p className="text-xs" style={{ color: "#6b7a90" }}>
              {filtered.length === 0
                ? "No results"
                : `Showing ${showFrom}–${showTo} of ${filtered.length.toLocaleString()} customers`}
            </p>
            <div className="flex items-center gap-3">
              {syncedAt && (
                <p className="text-xs" style={{ color: "#3db54a" }}>Last synced: {fmtSynced(syncedAt)}</p>
              )}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-md disabled:opacity-40"
                  style={{ backgroundColor: "#f5f5f5", color: "#1a2333", border: "1px solid #e4e8f0" }}>
                  <ChevronLeft className="w-3 h-3" /> Prev
                </button>
                <span className="text-xs px-2" style={{ color: "#6b7a90" }}>
                  {safePage} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-md disabled:opacity-40"
                  style={{ backgroundColor: "#f5f5f5", color: "#1a2333", border: "1px solid #e4e8f0" }}>
                  Next <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
