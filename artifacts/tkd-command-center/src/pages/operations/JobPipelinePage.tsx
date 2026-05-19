import { useState, useEffect, useCallback } from "react";
import { RefreshCw, CheckCircle, Clock, AlertCircle, Loader, XCircle, WifiOff } from "lucide-react";

/* ─── Types ───────────────────────────────────────────────────── */
type NormalizedStatus = "Complete" | "In Progress" | "Scheduled" | "Pending" | "Cancelled";

interface HcpJob {
  id: string;
  invoiceNumber: string;
  customer: string;
  service: string;
  status: NormalizedStatus;
  totalAmount: number | null;
  technician: string;
  technicianFirst: string;
  techColor: string;
  location: string;
  time: string;
  timeEnd: string;
  scheduledDate: string;
}

interface JobsResponse {
  jobs: HcpJob[];
  total_items: number;
  syncedAt: string;
  error?: string;
}

/* ─── Config ──────────────────────────────────────────────────── */
const STATUS_CONFIG: Record<NormalizedStatus, { bg: string; text: string; border: string; icon: typeof CheckCircle }> = {
  "Complete":    { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0", icon: CheckCircle },
  "In Progress": { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa", icon: Loader      },
  "Scheduled":   { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe", icon: Clock       },
  "Pending":     { bg: "#fefce8", text: "#854d0e", border: "#fde68a", icon: AlertCircle },
  "Cancelled":   { bg: "#fef2f2", text: "#991b1b", border: "#fecaca", icon: XCircle     },
};

function fmt(amount: number | null): { text: string; pending: boolean } {
  if (amount == null) return { text: "Pending", pending: true };
  return {
    text: "$" + amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    pending: false,
  };
}

function fmtSynced(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true });
}

function statusCounts(jobs: HcpJob[]) {
  const counts = { scheduled: 0, inProgress: 0, complete: 0, pending: 0 };
  for (const j of jobs) {
    if (j.status === "Scheduled")   counts.scheduled++;
    if (j.status === "In Progress") counts.inProgress++;
    if (j.status === "Complete")    counts.complete++;
    if (j.status === "Pending")     counts.pending++;
  }
  return counts;
}

/* ─── Component ──────────────────────────────────────────────── */
export function JobPipelinePage() {
  const [jobs, setJobs]           = useState<HcpJob[]>([]);
  const [syncedAt, setSyncedAt]   = useState<string>("");
  const [totalItems, setTotal]    = useState<number>(0);
  const [loading, setLoading]     = useState(true);
  const [syncing, setSyncing]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<"today" | "all">("today");

  const fetchJobs = useCallback(async (isManual = false) => {
    if (isManual) setSyncing(true); else setLoading(true);
    setError(null);
    try {
      const qs = dateFilter === "today" ? "?date=today" : "";
      const res = await fetch(`/api/hcp/jobs${qs}`);
      const data: JobsResponse = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Server error ${res.status}`);
      setJobs(data.jobs);
      setTotal(data.total_items);
      setSyncedAt(data.syncedAt);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load jobs");
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, [dateFilter]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const counts = statusCounts(jobs);
  const totalValue = jobs.reduce((s, j) => s + (j.totalAmount ?? 0), 0);

  const KPIS = [
    { label: "Scheduled",   value: String(counts.scheduled),  sub: "ready to go",       accent: "#2b4fac" },
    { label: "In Progress", value: String(counts.inProgress), sub: "currently running",  accent: "#f97316" },
    { label: "Completed",   value: String(counts.complete),   sub: "jobs finished",      accent: "#3db54a" },
    { label: "Pending",     value: String(counts.pending),    sub: "awaiting reply",     accent: "#eab308" },
  ];

  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="flex flex-col gap-4">

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
        {KPIS.map((k) => (
          <div key={k.label} className="bg-white rounded-lg px-3 py-3 md:px-4 md:py-3.5"
            style={{ border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", borderTop: `2px solid ${k.accent}` }}>
            <p className="text-[9px] md:text-xs font-semibold uppercase mb-1" style={{ color: "#6b7a90", letterSpacing: "0.6px" }}>{k.label}</p>
            {loading
              ? <div className="h-7 w-8 rounded bg-gray-100 animate-pulse mb-0.5" />
              : <p className="text-2xl font-bold tracking-tight mb-0.5" style={{ color: "#1a2333" }}>{k.value}</p>}
            <p className="text-[10px] md:text-xs" style={{ color: "#6b7a90" }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div className="bg-white rounded-lg overflow-hidden"
        style={{ border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>

        {/* Header */}
        <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderBottom: "1px solid #f0f0f0" }}>
          <div className="flex items-center gap-3">
            <p className="text-sm font-bold" style={{ color: "#1a2333" }}>
              {dateFilter === "today" ? `Today's Jobs — ${today}` : "All Jobs"}
            </p>
            <div className="flex rounded-md overflow-hidden" style={{ border: "1px solid #e5e7eb" }}>
              {(["today", "all"] as const).map((f) => (
                <button key={f} onClick={() => setDateFilter(f)}
                  className="px-3 py-1 text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: dateFilter === f ? "#2b4fac" : "white",
                    color: dateFilter === f ? "white" : "#6b7a90",
                  }}>
                  {f === "today" ? "Today" : "All"}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => fetchJobs(true)}
            disabled={syncing}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition-opacity disabled:opacity-60"
            style={{ backgroundColor: "#eff6ff", color: "#2b4fac", border: "1px solid #bfdbfe" }}
            data-testid="button-sync-housecall">
            <RefreshCw className={`w-3 h-3 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing…" : "Sync HouseCall Pro"}
          </button>
        </div>

        {/* Error state */}
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

        {/* Loading skeleton */}
        {loading && !error && (
          <div className="p-5 space-y-3">
            {[...Array(5)].map((_, i) => (
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
                    { label: "Time",       style: { minWidth: 120 } },
                    { label: "Customer",   style: { minWidth: 140 } },
                    { label: "Service",    style: { minWidth: 160 } },
                    { label: "Technician", style: { minWidth: 120 } },
                    { label: "Location",   style: { minWidth: 140 } },
                    { label: "Value",      style: { minWidth: 90  } },
                    { label: "Status",     style: { minWidth: 110 } },
                  ].map(({ label, style }) => (
                    <th key={label} className="px-5 py-3 text-left text-xs font-semibold uppercase"
                      style={{ color: "#6b7a90", letterSpacing: "0.5px", ...style }}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {jobs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-sm" style={{ color: "#6b7a90" }}>
                      No jobs found for this period.
                    </td>
                  </tr>
                )}
                {jobs.map((j) => {
                  const sc = STATUS_CONFIG[j.status];
                  const Icon = sc.icon;
                  const timeDisplay = j.time
                    ? (j.timeEnd ? `${j.time} – ${j.timeEnd}` : j.time)
                    : "—";
                  return (
                    <tr key={j.id} style={{ borderBottom: "1px solid #f5f5f5" }}>
                      <td className="px-5 py-3.5 text-xs font-semibold tabular-nums whitespace-nowrap" style={{ color: "#1a2333" }}>
                        {timeDisplay}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="block text-sm font-semibold" style={{ color: "#1a2333" }}>{j.customer}</span>
                        {j.invoiceNumber && (
                          <span className="block text-[11px] mt-0.5" style={{ color: "#9ca3af" }}>#{j.invoiceNumber}</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-xs" style={{ color: "#6b7a90", maxWidth: 180 }}>
                        <span className="line-clamp-2">{j.service || "—"}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                            style={{ backgroundColor: j.techColor }}>
                            {j.technicianFirst[0] ?? "?"}
                          </div>
                          <span className="text-sm whitespace-nowrap" style={{ color: "#1a2333" }}>{j.technician || "Unassigned"}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-xs" style={{ color: "#6b7a90" }}>{j.location || "—"}</td>
                      <td className="px-5 py-3.5 whitespace-nowrap" style={{ minWidth: 90 }}>
                        {(() => { const f = fmt(j.totalAmount); return <span style={{ color: f.pending ? "#9ca3af" : "#1a2333", fontWeight: f.pending ? 400 : 700, fontSize: f.pending ? "11px" : "13px" }}>{f.text}</span>; })()}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
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
        )}

        {/* Footer */}
        {!loading && !error && (
          <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: "1px solid #f0f0f0" }}>
            <p className="text-xs" style={{ color: "#6b7a90" }}>
              {jobs.length} jobs shown · Total value: {fmt(totalValue).text}
              {dateFilter === "all" && totalItems > jobs.length && ` · ${totalItems.toLocaleString()} total in HCP`}
            </p>
            {syncedAt && (
              <p className="text-xs" style={{ color: "#3db54a" }}>
                Last synced: {fmtSynced(syncedAt)}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
