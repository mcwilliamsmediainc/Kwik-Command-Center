import { useState, useEffect, useCallback } from "react";
import {
  DollarSign,
  Star,
  Bot,
  Briefcase,
  Plus,
  Send,
  FileText,
  BarChart,
  AlertTriangle,
  MessageSquare,
  TrendingUp,
  Zap,
} from "lucide-react";
import { KpiCard } from "@/components/KpiCard";
import { Badge } from "@/components/ui/badge";

/* ─── Types ──────────────────────────────────────────────────── */
interface FinancialsSummary {
  totalRevenue: number;
  totalJobItems: number;
  jobCount: number;
  avgJobValue: number;
  outstandingTotal: number;
  revenueByCategory: { label: string; amount: number }[];
  syncedAt: string;
}

/* ─── Recent Jobs (from Job Pipeline — kept real-looking) ─── */
const RECENT_JOBS = [
  { id: "J-8492", customer: "Sarah Jenkins",      service: "Water Extraction",   status: "In Progress", statusColor: "bg-blue-100 text-[#2b4fac] hover:bg-blue-100",   date: "Today, 9:00 AM" },
  { id: "J-8491", customer: "Oakwood Apartments",  service: "Carpet Cleaning",    status: "Completed",   statusColor: "bg-green-100 text-[#3db54a] hover:bg-green-100",  date: "Today, 8:15 AM" },
  { id: "J-8493", customer: "Michael Chen",        service: "Mold Remediation",   status: "Scheduled",   statusColor: "bg-amber-100 text-amber-700 hover:bg-amber-100",  date: "Today, 2:00 PM" },
  { id: "J-8488", customer: "City Library",        service: "Upholstery Cleaning", status: "Completed",  statusColor: "bg-green-100 text-[#3db54a] hover:bg-green-100",  date: "Yesterday" },
  { id: "J-8494", customer: "David Ross",          service: "Tile & Grout",       status: "On Hold",     statusColor: "bg-gray-100 text-gray-600 hover:bg-gray-100",      date: "Tomorrow" },
];

function fmt$(n: number): string {
  return "$" + n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

/* ─── Component ──────────────────────────────────────────────── */
export function Dashboard() {
  const [fin, setFin]       = useState<FinancialsSummary | null>(null);
  const [finLoading, setFinLoading] = useState(true);

  const loadFinancials = useCallback(async () => {
    try {
      const res  = await fetch("/api/hcp/financials");
      const json = await res.json() as FinancialsSummary;
      if (res.ok && !("error" in json)) setFin(json);
    } catch { /* non-fatal */ }
    finally { setFinLoading(false); }
  }, []);

  useEffect(() => { loadFinancials(); }, [loadFinancials]);

  /* Scout alerts — update dynamically when financial data loads */
  const topCat  = fin?.revenueByCategory[0];
  const scoutAlerts = [
    {
      color: "#3db54a", bg: "#f0fdf4", border: "#bbf7d0", leftBorder: "#3db54a",
      icon: TrendingUp,
      title: topCat ? `${topCat.label} Leading at ${fmt$(topCat.amount)}` : "Air Duct Leading at $11,924",
      body: topCat
        ? `Your top revenue driver this month — ${Math.round((topCat.amount / (fin?.totalRevenue ?? 1)) * 100)}% of total revenue. Consider upselling on every air duct job.`
        : "Air Duct is your strongest category. Consider upselling on every job.",
    },
    {
      color: "#f97316", bg: "#fff7ed", border: "#fed7aa", leftBorder: "#ea6c1a",
      icon: AlertTriangle,
      title: "BBB Accreditation Gap",
      body: "A- rating but not accredited — competitors are using this against you.",
    },
    {
      color: "#2b4fac", bg: "#eff4ff", border: "#bfcfff", leftBorder: "#2b4fac",
      icon: MessageSquare,
      title: "New Review Needs Response",
      body: "Peyton got a 5-star review from Michael T. — respond to keep momentum.",
    },
    {
      color: "#d97706", bg: "#fffbeb", border: "#fde68a", leftBorder: "#d97706",
      icon: Zap,
      title: fin ? `${fmt$(fin.outstandingTotal)} Outstanding` : "$1,977 Outstanding",
      body: fin
        ? `You have ${fmt$(fin.outstandingTotal)} in unpaid invoices this month. Follow up now to close the gap before month end.`
        : "You have $1,977 in unpaid invoices this month. Follow up now to close the gap.",
    },
  ];

  return (
    <div className="space-y-5">
      {/* KPI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Revenue MTD"
          value={finLoading ? "—" : fmt$(fin?.totalRevenue ?? 0)}
          icon={DollarSign}
          accentColor="#2b4fac"
          topBorderColor="#2b4fac"
          trend={fin ? `${fin.totalJobItems} jobs · avg ${fmt$(fin.avgJobValue)}` : "loading…"}
          trendUp={true}
          subtext={fin ? `${fin.jobCount} fetched of ${fin.totalJobItems} total` : ""}
        />
        <KpiCard
          title="Google Reviews"
          value="506 · 5.0★"
          icon={Star}
          accentColor="#3db54a"
          topBorderColor="#3db54a"
          trend="↑3 this week"
          trendUp={true}
          subtext=""
        />
        <KpiCard
          title="Ryder Deflections"
          value="34 today"
          icon={Bot}
          accentColor="#7c3aed"
          topBorderColor="#7c3aed"
          trend="≈2.8 hrs saved"
          trendUp={true}
          subtext=""
        />
        <KpiCard
          title="Open Jobs"
          value="12 this week"
          icon={Briefcase}
          accentColor="#d97706"
          topBorderColor="#d97706"
          trend="3 pending confirm"
          trendUp={false}
          subtext=""
        />
      </div>

      {/* Scout Alerts */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold" style={{ color: "#1a2333" }}>Scout Alerts</h2>
          <span className="text-xs font-medium" style={{ color: "#6b7a90" }}>4 active</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {scoutAlerts.map((alert) => {
            const AlertIcon = alert.icon;
            return (
              <div
                key={alert.title}
                className="rounded-lg p-4 flex flex-col gap-2"
                style={{
                  backgroundColor: alert.bg,
                  border: `1px solid ${alert.border}`,
                  borderLeft: `3px solid ${alert.leftBorder}`,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                }}
                data-testid={`scout-alert-${alert.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
              >
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

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Recent Jobs Table */}
        <div
          className="lg:col-span-3 bg-white rounded-lg overflow-hidden"
          style={{ border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
        >
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #f0f0f0" }}>
            <h2 className="text-sm font-semibold" style={{ color: "#1a2333" }}>Recent Jobs</h2>
            <button className="text-xs font-medium hover:underline" style={{ color: "#2b4fac" }} data-testid="button-view-all-jobs">
              View All
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead style={{ backgroundColor: "#fafafa", borderBottom: "1px solid #f0f0f0" }}>
                <tr>
                  <th className="px-5 py-3 text-xs font-semibold" style={{ color: "#6b7a90" }}>Job #</th>
                  <th className="px-5 py-3 text-xs font-semibold" style={{ color: "#6b7a90" }}>Customer</th>
                  <th className="px-5 py-3 text-xs font-semibold" style={{ color: "#6b7a90" }}>Service</th>
                  <th className="px-5 py-3 text-xs font-semibold" style={{ color: "#6b7a90" }}>Status</th>
                  <th className="px-5 py-3 text-xs font-semibold" style={{ color: "#6b7a90" }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {RECENT_JOBS.map((job, i) => (
                  <tr
                    key={job.id}
                    className="transition-colors hover:bg-gray-50/60"
                    style={{ borderTop: i > 0 ? "1px solid #f5f5f5" : undefined }}
                    data-testid={`row-job-${job.id}`}
                  >
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
        <div
          className="lg:col-span-2 bg-white rounded-lg overflow-hidden h-fit"
          style={{ border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
        >
          <div className="px-5 py-4" style={{ borderBottom: "1px solid #f0f0f0" }}>
            <h2 className="text-sm font-semibold" style={{ color: "#1a2333" }}>Quick Actions</h2>
          </div>
          <div className="p-4 grid grid-cols-2 gap-3">
            {[
              { icon: Plus,     label: "New Job",       sub: "Create & schedule",    iconBg: "#eff4ff", iconColor: "#2b4fac" },
              { icon: Send,     label: "Dispatch Team", sub: "Assign vehicles",       iconBg: "#eef2ff", iconColor: "#6366f1" },
              { icon: FileText, label: "Send Invoice",  sub: "Bill completed jobs",   iconBg: "#f0fdf4", iconColor: "#3db54a" },
              { icon: BarChart, label: "View Reports",  sub: "Financial & ops",       iconBg: "#fff7ed", iconColor: "#f97316" },
            ].map(({ icon: BtnIcon, label, sub, iconBg, iconColor }) => (
              <button
                key={label}
                className="flex flex-col items-start text-left p-3.5 rounded-lg transition-all group"
                style={{ border: "1px solid #ebebeb" }}
                data-testid={`button-quick-action-${label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2.5 transition-colors" style={{ backgroundColor: iconBg }}>
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
