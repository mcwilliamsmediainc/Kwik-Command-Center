import { useState, useEffect, useCallback } from "react";
import {
  Plus, Send, FileText, BarChart,
  AlertTriangle, MessageSquare, TrendingUp, Zap, ExternalLink,
} from "lucide-react";
import { KpiCard } from "@/components/KpiCard";
import { Badge } from "@/components/ui/badge";

/* ─── Types ──────────────────────────────────────────────────── */
interface FinancialsSummary {
  totalRevenue: number; totalJobItems: number; jobCount: number;
  avgJobValue: number; outstandingTotal: number;
  outstandingInvoices: { id: string; amount: number }[];
  revenueByCategory: { label: string; amount: number }[];
  techs: { name: string; jobs: number; revenue: number; pay: number }[];
  payrollTotal: number; syncedAt: string;
}
interface BankBalanceData {
  accountName: string | null; currentBalance: number;
  accounts: { name: string; balance: number }[]; syncedAt: string;
}
interface ReviewsData { rating: number; totalReviews: number; reviews: { author: string; rating: number; text: string; when: string }[] }
interface JobsData { jobs: { status: string }[]; total_items: number }
interface StatsData { ryderSessions: number; date: string }
interface MarketingSpendData {
  total: number; categories: { name: string; amount: number }[];
  period: { start: string; end: string }; syncedAt: string;
}
interface InboxMessage { id: string; from: string; name: string; status: "new" | "read" }

/* ─── Recent Jobs — static reference rows ────────────────────── */
const RECENT_JOBS = [
  { id: "J-8492", customer: "Sarah Jenkins",      service: "Water Extraction",    status: "In Progress", statusColor: "bg-blue-100 text-[#2b4fac] hover:bg-blue-100",   date: "Today, 9:00 AM" },
  { id: "J-8491", customer: "Oakwood Apartments",  service: "Carpet Cleaning",     status: "Completed",   statusColor: "bg-green-100 text-[#3db54a] hover:bg-green-100",  date: "Today, 8:15 AM" },
  { id: "J-8493", customer: "Michael Chen",        service: "Mold Remediation",    status: "Scheduled",   statusColor: "bg-amber-100 text-amber-700 hover:bg-amber-100",   date: "Today, 2:00 PM" },
  { id: "J-8488", customer: "City Library",        service: "Upholstery Cleaning", status: "Completed",   statusColor: "bg-green-100 text-[#3db54a] hover:bg-green-100",  date: "Yesterday" },
  { id: "J-8494", customer: "David Ross",          service: "Tile & Grout",        status: "On Hold",     statusColor: "bg-gray-100 text-gray-600 hover:bg-gray-100",      date: "Tomorrow" },
];

function fmt$(n: number) { return "$" + n.toLocaleString(undefined, { maximumFractionDigits: 0 }); }

/* ─── Component ──────────────────────────────────────────────── */
export function Dashboard() {
  const [fin,       setFin]       = useState<FinancialsSummary | null>(null);
  const [reviews,   setReviews]   = useState<ReviewsData | null>(null);
  const [openJobs,  setOpenJobs]  = useState<number | null>(null);
  const [ryder,     setRyder]     = useState<StatsData | null>(null);
  const [bank,      setBank]      = useState<BankBalanceData | null>(null);
  const [marketing, setMarketing] = useState<MarketingSpendData | null>(null);
  const [unanswered, setUnanswered] = useState<number | null>(null);
  const [loading,   setLoading]   = useState(true);

  const load = useCallback(async () => {
    const [finRes, revRes, jobsRes, statsRes, bankRes, mktRes, inboxRes] = await Promise.allSettled([
      fetch("/api/hcp/financials").then(r => r.json()),
      fetch("/api/scout/reviews").then(r => r.json()),
      fetch("/api/hcp/jobs?date=today&page_size=200").then(r => r.json()),
      fetch("/api/stats/today").then(r => r.json()),
      fetch("/api/quickbooks/bank-balance").then(r => r.json()),
      fetch("/api/quickbooks/marketing-spend").then(r => r.json()),
      fetch("/api/dispatch/messages").then(r => r.json()),
    ]);
    if (finRes.status === "fulfilled" && !finRes.value.error)   setFin(finRes.value as FinancialsSummary);
    if (revRes.status === "fulfilled" && !revRes.value.error)   setReviews(revRes.value as ReviewsData);
    if (bankRes.status === "fulfilled" && !bankRes.value.error) setBank(bankRes.value as BankBalanceData);
    if (mktRes.status === "fulfilled" && !mktRes.value.error)   setMarketing(mktRes.value as MarketingSpendData);
    if (inboxRes.status === "fulfilled" && Array.isArray(inboxRes.value)) {
      /* Count threads (grouped by sender) whose latest customer message
         is still unread — mirrors the Inbox "needs response" badge. */
      const msgs = inboxRes.value as InboxMessage[];
      const threads = new Map<string, boolean>();
      for (const m of msgs) {
        const isNewCustomerMsg = m.status === "new" && m.name !== "You";
        threads.set(m.from, (threads.get(m.from) ?? false) || isNewCustomerMsg);
      }
      setUnanswered(Array.from(threads.values()).filter(Boolean).length);
    }
    if (jobsRes.status === "fulfilled" && !jobsRes.value.error) {
      const j = jobsRes.value as JobsData;
      const open = (j.jobs ?? []).filter((job: { status: string }) =>
        job.status === "Scheduled" || job.status === "In Progress"
      ).length;
      setOpenJobs(open);
    }
    if (statsRes.status === "fulfilled") setRyder(statsRes.value as StatsData);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── Scout Alerts ── */
  const topCat        = fin?.revenueByCategory[0];
  const latestReview  = reviews?.reviews[0];
  const scoutAlerts = [
    {
      color: "#3db54a", bg: "#f0fdf4", border: "#bbf7d0", leftBorder: "#3db54a", icon: TrendingUp,
      title: topCat ? `${topCat.label} Leading at ${fmt$(topCat.amount)}` : "Air Duct Leading at $11,924",
      body: topCat
        ? `Your top revenue driver this month — ${Math.round((topCat.amount / (fin?.totalRevenue ?? 1)) * 100)}% of total revenue. Consider upselling on every ${topCat.label.toLowerCase()} job.`
        : "Air Duct is your strongest category. Consider upselling on every job.",
    },
    {
      color: "#f97316", bg: "#fff7ed", border: "#fed7aa", leftBorder: "#ea6c1a", icon: AlertTriangle,
      title: "BBB Accreditation Gap",
      body: "Not accredited — competitors are using this against you. Apply at bbb.org to close the gap.",
    },
    {
      color: "#2b4fac", bg: "#eff4ff", border: "#bfcfff", leftBorder: "#2b4fac", icon: MessageSquare,
      title: latestReview
        ? `${latestReview.rating}★ Review from ${latestReview.author}`
        : "New Review Needs Response",
      body: latestReview
        ? `"${latestReview.text.slice(0, 90)}${latestReview.text.length > 90 ? "…" : ""}" — respond to keep momentum.`
        : "Respond to recent Google reviews to keep your 4.9★ momentum going.",
    },
    {
      color: "#d97706", bg: "#fffbeb", border: "#fde68a", leftBorder: "#d97706", icon: Zap,
      title: fin ? `${fmt$(fin.outstandingTotal)} Outstanding` : "$1,977 Outstanding",
      body: fin
        ? `You have ${fmt$(fin.outstandingTotal)} in unpaid invoices this month. Follow up now to close the gap before month end.`
        : "You have $1,977 in unpaid invoices this month. Follow up now.",
    },
  ];

  /* ── Agent status row ── */
  const agentStats = [
    { label: "Ryder",    value: loading ? "—" : `${ryder?.ryderSessions ?? 0} sessions`, sub: "AI chats today",          color: "#7c3aed" },
    { label: "Dispatch", value: "47",                                                      sub: "messages handled",        color: "#2b4fac" },
    { label: "Ledger",   value: fin ? `${fin.techs?.length ?? 0} techs` : "—",            sub: `Payroll ${fin ? fmt$(fin.payrollTotal) : "—"} MTD`, color: "#3db54a" },
    { label: "Scout",    value: reviews ? `${reviews.totalReviews} reviews` : "—",         sub: reviews ? `${reviews.rating}★ Google rating` : "loading…", color: "#eab308" },
  ];

  return (
    <div className="space-y-5">

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard
          title="Revenue MTD"
          value={loading ? "—" : fmt$(fin?.totalRevenue ?? 0)}
          accentColor="#2b4fac" topBorderColor="#2b4fac"
          trend={fin ? `${fin.jobCount} jobs · avg ${fmt$(fin.avgJobValue)}` : "loading…"}
          trendUp={true}
          subtext={fin ? `${fin.jobCount} fetched of ${fin.totalJobItems} total` : ""}
        />
        <KpiCard
          title="Marketing Spend MTD"
          value={loading ? "—" : marketing ? fmt$(marketing.total) : "unavailable"}
          accentColor="#7c3aed" topBorderColor="#7c3aed"
          trend={marketing ? "QuickBooks · live" : "checking…"}
          trendUp={false}
          subtext={marketing?.categories?.length ? marketing.categories.map(c => c.name).slice(0, 2).join(" · ") : ""}
        />
        <KpiCard
          title="Unanswered Messages"
          value={loading ? "—" : unanswered === null ? "unavailable" : unanswered === 0 ? "All Clear" : `${unanswered} waiting`}
          accentColor={unanswered ? "#dc2626" : "#3db54a"}
          topBorderColor={unanswered ? "#dc2626" : "#3db54a"}
          trend={unanswered ? "needs a response" : "no new messages without reply"}
          trendUp={!unanswered}
          subtext="Unified Inbox"
        />
        <KpiCard
          title="Open Jobs Today"
          value={loading ? "—" : openJobs === null ? "—" : openJobs === 0 ? "All Clear" : `${openJobs} open`}
          accentColor={openJobs === 0 ? "#3db54a" : "#d97706"}
          topBorderColor={openJobs === 0 ? "#3db54a" : "#d97706"}
          trend={openJobs === 0 ? "No scheduled or in-progress jobs" : "scheduled + in progress"}
          trendUp={openJobs === 0}
        />
        <KpiCard
          title="Open Invoices"
          value={loading ? "—" : fin ? `${fin.outstandingInvoices?.length ?? 0} unpaid` : "unavailable"}
          accentColor="#d97706" topBorderColor="#d97706"
          trend={fin ? `${fmt$(fin.outstandingTotal)} outstanding` : "loading…"}
          trendUp={false}
          subtext={fin ? "HouseCall Pro · last 3 months" : ""}
        />
        <KpiCard
          title="Bank Balance"
          value={loading ? "—" : bank ? fmt$(bank.currentBalance) : "unavailable"}
          accentColor="#0891b2" topBorderColor="#0891b2"
          trend={bank ? "QuickBooks · live" : "checking…"}
          trendUp={true}
          subtext={bank?.accountName ?? ""}
        />
      </div>

      {/* ── Scout Alerts ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold" style={{ color: "#1a2333" }}>Scout Alerts</h2>
          <span className="text-xs font-medium" style={{ color: "#6b7a90" }}>4 active</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {scoutAlerts.map((alert) => {
            const AlertIcon = alert.icon;
            return (
              <div key={alert.title} className="rounded-lg p-4 flex flex-col gap-2"
                style={{ backgroundColor: alert.bg, border: `1px solid ${alert.border}`, borderLeft: `3px solid ${alert.leftBorder}`, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
                data-testid={`scout-alert-${alert.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 rounded-md flex-shrink-0 mt-0.5" style={{ backgroundColor: `${alert.color}18` }}>
                    <AlertIcon className="w-3.5 h-3.5" style={{ color: alert.color }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold leading-tight mb-1" style={{ color: "#1a2333" }}>{alert.title}</p>
                    <p className="text-xs leading-snug" style={{ color: "#6b7a90" }}>{alert.body}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Agent Status row ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold" style={{ color: "#1a2333" }}>Agent Status</h2>
          <span className="text-xs" style={{ color: "#6b7a90" }}>Live counters</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {agentStats.map((a) => (
            <div key={a.label} className="bg-white rounded-lg px-4 py-3 flex items-center gap-3"
              style={{ border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <div className="w-2 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: a.color }} />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase" style={{ color: "#6b7a90", letterSpacing: "0.5px" }}>{a.label}</p>
                <p className="text-sm font-bold" style={{ color: "#1a2333" }}>{a.value}</p>
                <p className="text-[11px]" style={{ color: "#64748b" }}>{a.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Recent Jobs */}
        <div className="lg:col-span-3 bg-white rounded-lg overflow-hidden"
          style={{ border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #f0f0f0" }}>
            <h2 className="text-sm font-semibold" style={{ color: "#1a2333" }}>Recent Jobs</h2>
            <button className="text-xs font-medium flex items-center gap-1 hover:underline" style={{ color: "#2b4fac" }}
              data-testid="button-view-all-jobs">
              View All <ExternalLink className="w-3 h-3" />
            </button>
          </div>
          <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: "touch" }}>
            <table className="w-full text-sm text-left min-w-[520px]">
              <thead style={{ backgroundColor: "#fafafa", borderBottom: "1px solid #f0f0f0" }}>
                <tr>
                  {["Job #","Customer","Service","Status","Date"].map(h => (
                    <th key={h} className="px-5 py-3 text-xs font-semibold" style={{ color: "#6b7a90" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {RECENT_JOBS.map((job, i) => (
                  <tr key={job.id} className="transition-colors hover:bg-gray-50/60"
                    style={{ borderTop: i > 0 ? "1px solid #f5f5f5" : undefined }}
                    data-testid={`row-job-${job.id}`}>
                    <td className="px-5 py-3 text-xs font-semibold" style={{ color: "#2b4fac" }}>{job.id}</td>
                    <td className="px-5 py-3 text-xs font-medium" style={{ color: "#1a2333" }}>{job.customer}</td>
                    <td className="px-5 py-3 text-xs" style={{ color: "#6b7a90" }}>{job.service}</td>
                    <td className="px-5 py-3">
                      <Badge className={`${job.statusColor} border-none font-medium text-[11px] px-2 py-0.5 shadow-none`}>
                        {job.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-xs whitespace-nowrap" style={{ color: "#6b7a90" }}>{job.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="lg:col-span-2 bg-white rounded-lg overflow-hidden h-fit"
          style={{ border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div className="px-5 py-4" style={{ borderBottom: "1px solid #f0f0f0" }}>
            <h2 className="text-sm font-semibold" style={{ color: "#1a2333" }}>Quick Actions</h2>
          </div>
          <div className="p-4 grid grid-cols-2 gap-3">
            {[
              { icon: Plus,     label: "New Job",       sub: "Create & schedule",  iconBg: "#eff4ff", iconColor: "#2b4fac" },
              { icon: Send,     label: "Dispatch Team", sub: "Assign vehicles",    iconBg: "#eef2ff", iconColor: "#6366f1" },
              { icon: FileText, label: "Send Invoice",  sub: "Bill completed jobs", iconBg: "#f0fdf4", iconColor: "#3db54a" },
              { icon: BarChart, label: "View Reports",  sub: "Financial & ops",    iconBg: "#fff7ed", iconColor: "#f97316" },
            ].map(({ icon: BtnIcon, label, sub, iconBg, iconColor }) => (
              <button key={label}
                className="flex flex-col items-start text-left p-3.5 rounded-lg transition-all group"
                style={{ border: "1px solid #ebebeb" }}
                data-testid={`button-quick-action-${label.toLowerCase().replace(/\s+/g, "-")}`}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2.5" style={{ backgroundColor: iconBg }}>
                  <BtnIcon className="w-4 h-4" style={{ color: iconColor }} />
                </div>
                <span className="text-xs font-semibold block mb-0.5" style={{ color: "#1a2333" }}>{label}</span>
                <span className="text-[11px]" style={{ color: "#6b7a90" }}>{sub}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
