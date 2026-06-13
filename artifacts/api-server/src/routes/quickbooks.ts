import { Router, type IRouter } from "express";
import {
  getBankAccounts,
  getProfitAndLoss,
  getBalanceSheet,
  getCompanyName,
  getQboStatus,
  normalizeProfitAndLoss,
  normalizeBalanceSheet,
} from "../lib/quickbooks.js";

const router: IRouter = Router();

interface CacheEntry<T> { data: T; expiresAt: number }
let cache: CacheEntry<BankBalancePayload> | null = null;
const TTL_MS = 3 * 60 * 1000;

interface BankBalancePayload {
  accountName: string | null;
  currentBalance: number;
  accounts: { name: string; balance: number }[];
  syncedAt: string;
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Map a named period to a [start, end] date range (UTC, YYYY-MM-DD). */
function periodRange(period: string): { start: string; end: string } {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();

  if (period === "month" || period === "mtd" || period === "this_month") {
    // Current month to date — aligns QBO expenses with the HouseCall Pro
    // current-month revenue the Ledger/Finn page shows.
    const start = new Date(Date.UTC(y, m, 1));
    return { start: ymd(start), end: ymd(now) };
  }
  if (period === "last_month") {
    const start = new Date(Date.UTC(y, m - 1, 1));
    const end = new Date(Date.UTC(y, m, 0)); // day 0 of this month = last day of prev
    return { start: ymd(start), end: ymd(end) };
  }
  if (period === "last_quarter") {
    const startMonth = (Math.floor(m / 3) - 1) * 3; // first month of previous quarter
    const start = new Date(Date.UTC(y, startMonth, 1));
    const end = new Date(Date.UTC(y, startMonth + 3, 0));
    return { start: ymd(start), end: ymd(end) };
  }
  // ytd (default)
  return { start: `${y}-01-01`, end: ymd(now) };
}

/* ── GET /api/quickbooks/bank-balance ──────────────────────────── */
router.get("/quickbooks/bank-balance", async (req, res) => {
  try {
    if (cache && Date.now() < cache.expiresAt) {
      res.json(cache.data);
      return;
    }

    const accounts = await getBankAccounts();
    // "Primary" = first active Bank account (QuickBooks orders by Id);
    // fall back to the first account if none are flagged active.
    const active = accounts.filter((a) => a.Active !== false);
    const primary = active[0] ?? accounts[0] ?? null;

    const payload: BankBalancePayload = {
      accountName: primary?.Name ?? null,
      currentBalance: primary?.CurrentBalance ?? 0,
      accounts: accounts.map((a) => ({ name: a.Name, balance: a.CurrentBalance })),
      syncedAt: new Date().toISOString(),
    };

    cache = { data: payload, expiresAt: Date.now() + TTL_MS };
    res.json(payload);
  } catch (err) {
    req.log.error({ err }, "quickbooks /bank-balance failed");
    res.status(502).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

/* ── GET /api/quickbooks/pnl?period=ytd|last_month|last_quarter ── */
router.get("/quickbooks/pnl", async (req, res) => {
  try {
    const period = String(req.query.period ?? "ytd");
    const { start, end } = periodRange(period);
    const report = await getProfitAndLoss(start, end);
    res.json(normalizeProfitAndLoss(report, start, end));
  } catch (err) {
    req.log.error({ err }, "quickbooks /pnl failed");
    res.status(502).json({
      error: String(err instanceof Error ? err.message : err),
      needsReauth: getQboStatus().needsReauth,
    });
  }
});

/* ── GET /api/quickbooks/marketing-spend ─────────────────────────
   Month-to-date marketing/advertising spend, summed from P&L expense
   accounts whose names look marketing-related. */
const MARKETING_RE = /market|advertis|\bads?\b|promo|seo\b|google ads|facebook|meta ads|sponsor|billboard|mailer|flyer|lead gen/i;

interface MarketingSpendPayload {
  total: number;
  categories: { name: string; amount: number }[];
  period: { start: string; end: string };
  syncedAt: string;
}
let marketingCache: CacheEntry<MarketingSpendPayload> | null = null;

router.get("/quickbooks/marketing-spend", async (req, res) => {
  try {
    if (marketingCache && Date.now() < marketingCache.expiresAt) {
      res.json(marketingCache.data);
      return;
    }

    const now = new Date();
    const start = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
    const end = ymd(now);

    const report = await getProfitAndLoss(start, end);
    const pnl = normalizeProfitAndLoss(report, start, end);

    const categories = pnl.byCategory
      .filter((c) => MARKETING_RE.test(c.name) && c.amount !== 0)
      .map((c) => ({ name: c.name, amount: c.amount }))
      .sort((a, b) => b.amount - a.amount);

    const payload: MarketingSpendPayload = {
      total: Math.round(categories.reduce((s, c) => s + c.amount, 0) * 100) / 100,
      categories,
      period: { start, end },
      syncedAt: new Date().toISOString(),
    };

    marketingCache = { data: payload, expiresAt: Date.now() + TTL_MS };
    res.json(payload);
  } catch (err) {
    req.log.error({ err }, "quickbooks /marketing-spend failed");
    res.status(502).json({
      error: String(err instanceof Error ? err.message : err),
      needsReauth: getQboStatus().needsReauth,
    });
  }
});

/* ── GET /api/quickbooks/balance-sheet ─────────────────────────── */
router.get("/quickbooks/balance-sheet", async (req, res) => {
  try {
    const asOf = ymd(new Date());
    const report = await getBalanceSheet(asOf);
    res.json(normalizeBalanceSheet(report, asOf));
  } catch (err) {
    req.log.error({ err }, "quickbooks /balance-sheet failed");
    res.status(502).json({
      error: String(err instanceof Error ? err.message : err),
      needsReauth: getQboStatus().needsReauth,
    });
  }
});

/* ── GET /api/quickbooks/health ────────────────────────────────── */
router.get("/quickbooks/health", async (req, res) => {
  try {
    const companyName = await getCompanyName();
    const status = getQboStatus();
    res.json({
      connected: !status.needsReauth,
      realmId: status.realmId,
      companyName,
      lastRefresh: status.lastRefresh,
      needsReauth: status.needsReauth,
    });
  } catch (err) {
    req.log.warn({ err }, "quickbooks /health check failed");
    const status = getQboStatus();
    res.json({
      connected: false,
      realmId: status.realmId,
      companyName: null,
      lastRefresh: status.lastRefresh,
      needsReauth: status.needsReauth,
    });
  }
});

export default router;
