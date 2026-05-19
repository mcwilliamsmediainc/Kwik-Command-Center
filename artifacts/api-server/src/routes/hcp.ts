import { Router, type IRouter } from "express";

const HCP_BASE = "https://api.housecallpro.com";

function hcpHeaders() {
  return {
    Authorization: `Token ${process.env.HOUSECALLPRO_API_KEY}`,
    "Content-Type": "application/json",
  };
}

async function hcpGet(path: string, params?: Record<string, string>) {
  const url = new URL(`${HCP_BASE}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), { headers: hcpHeaders() });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HCP ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

const router: IRouter = Router();

/* ── Simple in-memory cache ───────────────────────────────────── */
interface CacheEntry<T> { data: T; expiresAt: number }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cache = new Map<string, CacheEntry<any>>();
function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expiresAt) return entry.data as T;
  return null;
}
function setCached<T>(key: string, data: T, ttlMs = 3 * 60 * 1000): void {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

router.get("/hcp/jobs", async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const params: Record<string, string> = {
      page: String(req.query.page ?? 1),
      page_size: String(req.query.page_size ?? 50),
    };

    if (req.query.date === "today") {
      params.scheduled_start_min = startOfDay.toISOString();
      params.scheduled_start_max = endOfDay.toISOString();
    }

    const data = await hcpGet("/jobs", params) as {
      jobs: HcpJob[];
      total_items: number;
      total_pages: number;
      page: number;
      page_size: number;
    };

    if (data.jobs.length > 0) {
      req.log.info({ rawJobSample: data.jobs[0] }, "hcp raw job fields (first result)");
    }
    const normalized = data.jobs
      .map(normalizeJob)
      .filter((j) => j.customer && j.customer !== "Unknown" && j.customer.toLowerCase() !== "no customer");
    res.json({
      jobs: normalized,
      total_items: data.total_items,
      total_pages: data.total_pages,
      page: data.page,
      syncedAt: new Date().toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "hcp /jobs failed");
    res.status(502).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

router.get("/hcp/customers", async (req, res) => {
  try {
    const CACHE_KEY = "hcp:customers";
    const cached = getCached(CACHE_KEY);
    if (cached) { res.json(cached); return; }

    const now = new Date();
    const ago365 = new Date(now.getTime() - 365 * 86400000).toISOString();
    const ago730 = new Date(now.getTime() - 730 * 86400000).toISOString();

    // 9 parallel calls: 4 customer pages + 2 recent job pages + 2 old job pages + estimates
    const [c1, c2, c3, c4, rj1, rj2, oj1, oj2, estimatesData] = await Promise.all([
      hcpGet("/customers", { page: "1", page_size: "200" }) as Promise<HcpCustomerPage>,
      hcpGet("/customers", { page: "2", page_size: "200" }) as Promise<HcpCustomerPage>,
      hcpGet("/customers", { page: "3", page_size: "200" }) as Promise<HcpCustomerPage>,
      hcpGet("/customers", { page: "4", page_size: "200" }) as Promise<HcpCustomerPage>,
      // Recent jobs — identifies currently active customers
      hcpGet("/jobs", { page: "1", page_size: "100" }) as Promise<HcpJobPage>,
      hcpGet("/jobs", { page: "2", page_size: "100" }) as Promise<HcpJobPage>,
      // Old jobs (1–2 yrs ago) — identifies dormant customers with real LTV
      hcpGet("/jobs", { page: "1", page_size: "100", scheduled_start_min: ago730, scheduled_start_max: ago365 }) as Promise<HcpJobPage>,
      hcpGet("/jobs", { page: "2", page_size: "100", scheduled_start_min: ago730, scheduled_start_max: ago365 }) as Promise<HcpJobPage>,
      hcpGet("/estimates", { page: "1", page_size: "1" }) as Promise<{ total_items: number }>,
    ]);

    // Build separate stats maps: recent (≤ ~90 days) vs old (365–730 days ago)
    function buildStatsMap(jobs: HcpJob[]): Map<string, CustomerStats> {
      const map = new Map<string, CustomerStats>();
      for (const job of jobs) {
        const custId = job.customer?.id;
        if (!custId) continue;
        const jobDate = job.schedule?.scheduled_start ?? job.created_at ?? "";
        const amount = resolveAmount(job) ?? 0;
        const name = [job.customer?.first_name, job.customer?.last_name].filter(Boolean).join(" ");
        const phone = (job.customer?.mobile_number ?? "").replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3");
        const existing = map.get(custId);
        if (!existing) {
          map.set(custId, { lastJobDate: jobDate, lastJobService: job.description ?? "", jobCount: 1, totalSpent: amount, customerName: name, customerPhone: phone });
        } else {
          existing.jobCount++;
          existing.totalSpent += amount;
          if (jobDate > existing.lastJobDate) { existing.lastJobDate = jobDate; existing.lastJobService = job.description ?? ""; }
        }
      }
      return map;
    }

    const recentMap = buildStatsMap([...rj1.jobs, ...rj2.jobs]);
    const oldMap    = buildStatsMap([...oj1.jobs, ...oj2.jobs]);

    // Dormant = appeared in old jobs (1–2 yrs ago) but NOT in recent jobs
    const dormantFromJobs = [...oldMap.entries()]
      .filter(([custId]) => !recentMap.has(custId))
      .map(([custId, stats]) => ({
        id: custId,
        name: stats.customerName,
        phone: stats.customerPhone,
        lastJobService: stats.lastJobService,
        lastJobDate: stats.lastJobDate,
        totalSpent: stats.totalSpent,
        daysSince: stats.lastJobDate
          ? Math.floor((Date.now() - new Date(stats.lastJobDate).getTime()) / 86400000)
          : null,
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent);

    const allCustomers = [
      ...(c1.customers ?? []),
      ...(c2.customers ?? []),
      ...(c3.customers ?? []),
      ...(c4.customers ?? []),
    ];
    const normalized = allCustomers
      .filter((c) => c.first_name || c.last_name)
      .map((c) => {
        // Prefer recent stats; fall back to old stats for dormant customers
        const recent = recentMap.get(c.id);
        const old    = oldMap.get(c.id);
        const stats  = recent ?? old;
        const phone = c.mobile_number ?? c.home_number ?? c.work_number ?? "";
        const city = c.addresses?.[0]?.city ?? "";
        const lastJobDate = stats?.lastJobDate ?? "";
        const daysSince = lastJobDate
          ? Math.floor((Date.now() - new Date(lastJobDate).getTime()) / 86400000)
          : null;

        return {
          id: c.id,
          name: [c.first_name, c.last_name].filter(Boolean).join(" "),
          phone: phone ? phone.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3") : "",
          email: c.email ?? "",
          city,
          lastJobDate,
          lastJobService: stats?.lastJobService ?? "",
          jobCount: stats?.jobCount ?? 0,
          totalSpent: stats?.totalSpent ?? 0,
          status: dormantStatus(daysSince),
          daysSince,
        };
      })
      .sort((a, b) => (b.lastJobDate > a.lastJobDate ? 1 : -1));

    const avgLtv = normalized.length
      ? Math.round(normalized.reduce((s, c) => s + c.totalSpent, 0) / normalized.length)
      : 0;

    const payload = {
      customers: normalized,
      dormant_customers: dormantFromJobs,
      total_items: c1.total_items,
      estimates_count: estimatesData.total_items,
      dormant_365: dormantFromJobs.length,
      avg_ltv: avgLtv,
      syncedAt: new Date().toISOString(),
    };
    setCached(CACHE_KEY, payload);
    res.json(payload);
  } catch (err) {
    req.log.error({ err }, "hcp /customers failed");
    res.status(502).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

interface HcpCustomerPage {
  customers: RawCustomer[];
  total_items: number;
}

interface RawCustomer {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  mobile_number?: string;
  home_number?: string;
  work_number?: string;
  updated_at?: string;
  addresses?: { city?: string }[];
}

interface HcpJobPage {
  jobs: HcpJob[];
  total_items: number;
}

interface CustomerStats {
  lastJobDate: string;
  lastJobService: string;
  jobCount: number;
  totalSpent: number;
  customerName: string;
  customerPhone: string;
}

function dormantStatus(days: number | null): string {
  if (days === null) return "No Jobs";
  if (days <= 90)  return "Active";
  if (days <= 180) return "Dormant 3mo";
  if (days <= 365) return "Dormant 6mo";
  return "Dormant 1yr+";
}

router.get("/hcp/invoices", async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
    const data = await hcpGet("/invoices", {
      page: String(req.query.page ?? 1),
      page_size: String(req.query.page_size ?? 50),
      created_start: startOfMonth,
      created_end: endOfMonth,
    });
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "hcp /invoices failed");
    res.status(502).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

/* ── Types & normalization ─────────────────────────────────── */

interface HcpEmployee {
  first_name: string;
  last_name: string;
  color_hex?: string;
}

interface HcpJob {
  id: string;
  invoice_number?: string;
  description?: string;
  work_status: string;
  total_amount?: number;
  invoice_total?: number;
  total?: number;
  price?: number;
  job_total?: number;
  outstanding_balance?: number;
  subtotal?: number;
  customer?: { id?: string; first_name?: string; last_name?: string; mobile_number?: string };
  address?: { street?: string; street_line_2?: string; city?: string; state?: string; zip?: string };
  schedule?: { scheduled_start?: string; scheduled_end?: string };
  created_at?: string;
  assigned_employees?: HcpEmployee[];
  [key: string]: unknown;
}

/** Resolve total from whichever field HCP populates; divide by 100 (cents). Returns null if no positive value found. */
function resolveAmount(j: HcpJob): number | null {
  const candidates = [
    j.total_amount,
    j.invoice_total,
    j.total,
    j.price,
    j.job_total,
    j.outstanding_balance,
    j.subtotal,
  ];
  for (const val of candidates) {
    if (val != null && val > 0) return val / 100;
  }
  return null;
}

const CT = "America/Chicago";

function fmtCT(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    timeZone: CT,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function normalizeJob(j: HcpJob) {
  const tech = j.assigned_employees?.[0];
  const scheduledStart = j.schedule?.scheduled_start;
  const scheduledEnd   = j.schedule?.scheduled_end;
  const timeStr    = scheduledStart ? fmtCT(scheduledStart) : "";
  const timeEndStr = scheduledEnd   ? fmtCT(scheduledEnd)   : "";
  const scheduledDate = scheduledStart ? new Date(scheduledStart).toISOString().slice(0, 10) : "";

  return {
    id: j.id,
    invoiceNumber: j.invoice_number ?? "",
    customer: [j.customer?.first_name, j.customer?.last_name].filter(Boolean).join(" ") || "Unknown",
    customerPhone: j.customer?.mobile_number ?? "",
    service: j.description ?? "",
    status: normalizeStatus(j.work_status),
    rawStatus: j.work_status,
    totalAmount: resolveAmount(j),
    technician: tech ? `${tech.first_name} ${tech.last_name}` : "",
    technicianFirst: tech?.first_name ?? "",
    techColor: tech?.color_hex ? `#${tech.color_hex}` : "#6b7a90",
    location: [j.address?.street, j.address?.city].filter(Boolean).join(", "),
    time: timeStr,
    timeEnd: timeEndStr,
    scheduledDate,
    scheduledStart: scheduledStart ?? "",
  };
}

function normalizeStatus(s: string): "Complete" | "In Progress" | "Scheduled" | "Pending" | "Cancelled" {
  switch (s) {
    case "completed":
    case "needs_invoicing":
      return "Complete";
    case "in_progress":
      return "In Progress";
    case "scheduled":
      return "Scheduled";
    case "cancelled":
      return "Cancelled";
    default:
      return "Pending";
  }
}

/* ── Invoice types ─────────────────────────────────────────── */
interface HcpInvoice {
  id: string;
  status: string;
  amount?: number;
  due_amount?: number;
  invoice_date?: string | null;
  invoice_number?: string | null;
  job_id?: string;
}

interface HcpInvoicePage {
  invoices: HcpInvoice[];
  total_items: number;
  total_pages?: number;
}

/* ── /hcp/financials ───────────────────────────────────────── */
router.get("/hcp/financials", async (req, res) => {
  try {
    const CACHE_KEY = "hcp:financials";
    const cached = getCached(CACHE_KEY);
    if (cached) { res.json(cached); return; }

    const now = new Date();
    const monthStart  = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const monthEnd    = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
    const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const jobParams = (page: string) => ({
      page, page_size: "100",
      scheduled_start_min: monthStart,
      scheduled_start_max: monthEnd,
    });
    const invParams = (page: string) => ({
      page, page_size: "100",
      created_start: monthStart,
      created_end: monthEnd,
    });

    const [j1, j2, j3, inv1, inv2] = await Promise.all([
      hcpGet("/jobs",     jobParams("1")) as Promise<HcpJobPage>,
      hcpGet("/jobs",     jobParams("2")) as Promise<HcpJobPage>,
      hcpGet("/jobs",     jobParams("3")) as Promise<HcpJobPage>,
      hcpGet("/invoices", invParams("1")) as Promise<HcpInvoicePage>,
      hcpGet("/invoices", invParams("2")) as Promise<HcpInvoicePage>,
    ]);

    const allJobs     = [...j1.jobs, ...j2.jobs, ...j3.jobs];
    const allInvoices = [...(inv1.invoices ?? []), ...(inv2.invoices ?? [])]
      .filter(i => i.invoice_date?.startsWith(monthPrefix));

    /* ── Revenue by service category ── */
    function categorize(desc: string): string {
      const d = (desc || "").toLowerCase();
      if (d.includes("carpet") || d.includes(" rug") || d.includes("area rug") || d.includes("runner")) return "Carpet Cleaning";
      if (d.includes("sofa") || d.includes("sectional") || d.includes("upholstery") || d.includes("couch") || d.includes("loveseat") || d.includes("ottoman")) return "Upholstery";
      if (d.includes("tile") || d.includes("grout") || d.includes("shower tile")) return "Tile & Grout";
      if (d.includes("wood") || d.includes("hardwood") || d.includes("hard wood") || d.includes("floor sealing")) return "Wood Floors";
      if (d.includes("air duct") || d.includes("duct cleaning")) return "Air Duct";
      return "Other Services";
    }

    const categoryMap: Record<string, number> = {};
    const techMap: Record<string, { color: string; jobs: number; revenue: number }> = {};
    let totalRevenue = 0;

    for (const job of allJobs) {
      const amount = resolveAmount(job) ?? 0;
      totalRevenue += amount;

      const cat = categorize(job.description ?? "");
      categoryMap[cat] = (categoryMap[cat] ?? 0) + amount;

      if (job.assigned_employees?.length) {
        const emp  = job.assigned_employees[0];
        const name = `${emp.first_name} ${emp.last_name}`.trim();
        if (!techMap[name]) {
          techMap[name] = { color: `#${emp.color_hex ?? "2b4fac"}`, jobs: 0, revenue: 0 };
        }
        techMap[name].jobs++;
        techMap[name].revenue += amount;
      }
    }

    /* ── Build job_id → customer name lookup ── */
    const jobCustomerMap = new Map<string, string>();
    for (const job of allJobs) {
      const name = [job.customer?.first_name, job.customer?.last_name].filter(Boolean).join(" ") || "Unknown";
      jobCustomerMap.set(job.id, name);
    }

    /* ── Invoice totals (already filtered to current month) ── */
    let paidTotal = 0, outstandingTotal = 0, paidCount = 0;
    const outstandingInvoices: { id: string; invoiceNumber: string; customerName: string; amount: number; invoiceDate: string }[] = [];

    for (const inv of allInvoices) {
      if (inv.status === "paid") {
        paidTotal += (inv.amount ?? 0) / 100;
        paidCount++;
      }
      if (inv.status === "open" || inv.status === "outstanding") {
        const amt = (inv.due_amount ?? inv.amount ?? 0) / 100;
        outstandingTotal += amt;
        outstandingInvoices.push({
          id:            inv.id,
          invoiceNumber: inv.invoice_number ?? "",
          customerName:  inv.job_id ? (jobCustomerMap.get(inv.job_id) ?? "Unknown") : "Unknown",
          amount:        Math.round(amt * 100) / 100,
          invoiceDate:   inv.invoice_date ?? "",
        });
      }
    }
    outstandingInvoices.sort((a, b) => b.amount - a.amount);

    const PAY_RATE = 40; // $40 flat per job
    const techs = Object.entries(techMap)
      .map(([name, t]) => ({
        name,
        color:   t.color,
        jobs:    t.jobs,
        revenue: Math.round(t.revenue * 100) / 100,
        pay:     t.jobs * PAY_RATE,
      }))
      .sort((a, b) => b.jobs - a.jobs);

    const payrollTotal = techs.reduce((s, t) => s + t.pay, 0);

    const revenueByCategory = Object.entries(categoryMap)
      .map(([label, amount]) => ({ label, amount: Math.round(amount * 100) / 100 }))
      .sort((a, b) => b.amount - a.amount);

    const payload = {
      month:               now.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      totalRevenue:        Math.round(totalRevenue * 100) / 100,
      jobCount:            allJobs.length,
      totalJobItems:       j1.total_items,
      paidTotal:           Math.round(paidTotal * 100) / 100,
      paidCount,
      outstandingTotal:    Math.round(outstandingTotal * 100) / 100,
      outstandingInvoices,
      avgJobValue:         allJobs.length ? Math.round((totalRevenue / allJobs.length) * 100) / 100 : 0,
      revenueByCategory,
      techs,
      payrollTotal,
      syncedAt:            new Date().toISOString(),
    };

    setCached(CACHE_KEY, payload, 3 * 60 * 1000);
    res.json(payload);
  } catch (err) {
    req.log.error({ err }, "hcp /financials failed");
    res.status(502).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

export default router;
