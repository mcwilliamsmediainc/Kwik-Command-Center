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
    const normalized = data.jobs.map(normalizeJob);
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
    const data = await hcpGet("/customers", {
      page: String(req.query.page ?? 1),
      page_size: String(req.query.page_size ?? 50),
    });
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "hcp /customers failed");
    res.status(502).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

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
  customer?: { first_name?: string; last_name?: string; mobile_number?: string };
  address?: { street?: string; street_line_2?: string; city?: string; state?: string; zip?: string };
  schedule?: { scheduled_start?: string; scheduled_end?: string };
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

export default router;
