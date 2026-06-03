// QuickBooks Online access via OAuth2 (Authorization Code flow, v3 API).
//
// Refresh tokens ROTATE: each refresh may return a NEW refresh token and the
// old one is invalidated. We persist the latest refresh token in Postgres
// (oauth_tokens) so the integration survives restarts/redeploys — a local
// JSON file would be lost on Replit's ephemeral deploy filesystem. The access
// token (60-min lifetime) is cached in memory and refreshed when under 5 min
// remain. Report responses are cached 30 min per report+date-range, and all
// company API calls go through a max-10 concurrency limiter to respect QBO's
// rate limits (500 req/min, 10 concurrent per company).
import { db, oauthTokensTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const PROVIDER = "quickbooks";
const TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
const AUTHORIZE_URL = "https://appcenter.intuit.com/connect/oauth2";
const QBO_SCOPE = "com.intuit.quickbooks.accounting";
const MINOR_VERSION = "75";
const ACCESS_TOKEN_SKEW_MS = 5 * 60 * 1000; // refresh when <5 min remain
const REPORT_TTL_MS = 30 * 60 * 1000; // cache reports 30 min
const COMPANY_TTL_MS = 30 * 60 * 1000;
const MAX_CONCURRENT = 10;

function apiBase(): string {
  const env = (process.env.QBO_ENVIRONMENT ?? "production").toLowerCase();
  return env === "sandbox"
    ? "https://sandbox-quickbooks.api.intuit.com"
    : "https://quickbooks.api.intuit.com";
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not configured`);
  return v;
}

/* ── Connection status (exposed via /health) ───────────────────── */
let needsReauth = false;
let lastRefresh: string | null = null;

export interface QboStatus {
  needsReauth: boolean;
  lastRefresh: string | null;
  realmId: string | null;
}

export function getQboStatus(): QboStatus {
  return {
    needsReauth,
    lastRefresh,
    realmId: cachedRealmId ?? process.env.QBO_REALM_ID ?? null,
  };
}

/* ── Concurrency limiter (max 10 in-flight company API calls) ──── */
let active = 0;
const waiters: Array<() => void> = [];

async function withLimit<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= MAX_CONCURRENT) {
    await new Promise<void>((resolve) => waiters.push(resolve));
  }
  active++;
  try {
    return await fn();
  } finally {
    active--;
    waiters.shift()?.();
  }
}

/* ── Refresh-token + realmId persistence ───────────────────────── */
// Realm (company) id is resolved from the DB connection first, falling back
// to the env secret. Cached in memory so the sync getQboStatus() can report it.
let cachedRealmId: string | null = process.env.QBO_REALM_ID ?? null;

async function loadRefreshToken(): Promise<string> {
  const rows = await db
    .select()
    .from(oauthTokensTable)
    .where(eq(oauthTokensTable.provider, PROVIDER))
    .limit(1);
  const row = rows[0];
  if (row?.realmId) cachedRealmId = row.realmId;
  if (row?.refreshToken) return row.refreshToken;
  // Seed from the env secret on first run only.
  return requireEnv("QBO_REFRESH_TOKEN");
}

async function getRealmId(): Promise<string> {
  if (cachedRealmId) return cachedRealmId;
  const rows = await db
    .select()
    .from(oauthTokensTable)
    .where(eq(oauthTokensTable.provider, PROVIDER))
    .limit(1);
  const realmId = rows[0]?.realmId ?? process.env.QBO_REALM_ID ?? null;
  if (!realmId) throw new Error("QBO_REALM_ID is not configured");
  cachedRealmId = realmId;
  return realmId;
}

async function saveRefreshToken(refreshToken: string): Promise<void> {
  await db
    .insert(oauthTokensTable)
    .values({ provider: PROVIDER, refreshToken })
    .onConflictDoUpdate({
      target: oauthTokensTable.provider,
      set: { refreshToken },
    });
}

/* ── Access-token cache ────────────────────────────────────────── */
let accessTokenCache: { token: string; expiresAt: number } | null = null;
// Single-flight guard: refresh tokens ROTATE, so concurrent refreshes with the
// same token would make all-but-one fail with invalid_grant (false needsReauth).
// Funnel every concurrent caller through one in-flight refresh.
let refreshInFlight: Promise<string> | null = null;
// Bumped every time a reconnect persists a new connection. A refresh that was
// already in flight when a reconnect lands is "stale" and must not write its
// (old-chain) results over the freshly authorized token/realm state.
let connectionGeneration = 0;

function getAccessToken(): Promise<string> {
  if (accessTokenCache && Date.now() < accessTokenCache.expiresAt) {
    return Promise.resolve(accessTokenCache.token);
  }
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = refreshAccessToken().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

async function refreshAccessToken(): Promise<string> {
  // Re-check: another caller may have refreshed while we awaited the lock.
  if (accessTokenCache && Date.now() < accessTokenCache.expiresAt) {
    return accessTokenCache.token;
  }

  // Snapshot the connection generation: if a reconnect lands while this refresh
  // is in flight, our results are stale and must not overwrite the new state.
  const gen = connectionGeneration;

  const clientId = requireEnv("QBO_CLIENT_ID");
  const clientSecret = requireEnv("QBO_CLIENT_SECRET");
  const refreshToken = await loadRefreshToken();

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    // A 400 invalid_grant means the refresh token is dead — the connection
    // must be re-authorized by a human. Flag it for the UI, UNLESS a reconnect
    // already superseded this stale refresh (don't resurrect needsReauth).
    if (res.status === 400 && /invalid_grant/i.test(text)) {
      if (gen === connectionGeneration) needsReauth = true;
      throw new Error(
        "QuickBooks refresh token is invalid (invalid_grant) — reconnect required.",
      );
    }
    throw new Error(`QuickBooks token refresh ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  // A reconnect landed while we were refreshing the old chain: hand the token
  // back to in-flight callers (valid for the request they already started) but
  // do NOT persist it or mutate shared cache/realm/needsReauth state.
  if (gen !== connectionGeneration) {
    return data.access_token;
  }

  // Persist the (possibly rotated) refresh token for next time.
  if (data.refresh_token) {
    await saveRefreshToken(data.refresh_token);
  }

  needsReauth = false;
  lastRefresh = new Date().toISOString();
  accessTokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + Math.max(0, data.expires_in * 1000 - ACCESS_TOKEN_SKEW_MS),
  };
  return accessTokenCache.token;
}

/* ── Query helper (SQL-like company queries) ───────────────────── */
async function query<T>(statement: string): Promise<T> {
  const realmId = await getRealmId();
  return withLimit(async () => {
    const accessToken = await getAccessToken();
    const url = new URL(`${apiBase()}/v3/company/${realmId}/query`);
    url.searchParams.set("query", statement);
    url.searchParams.set("minorversion", MINOR_VERSION);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`QuickBooks query ${res.status}: ${text.slice(0, 200)}`);
    }
    return res.json() as Promise<T>;
  });
}

/* ── Report fetcher (cached 30 min per report + params) ─────────── */
export interface QboColData {
  value?: string;
  id?: string;
}
export interface QboReportRow {
  type?: string;
  group?: string;
  Header?: { ColData?: QboColData[] };
  Rows?: { Row?: QboReportRow[] };
  Summary?: { ColData?: QboColData[] };
  ColData?: QboColData[];
}
export interface QboReport {
  Header?: {
    ReportName?: string;
    StartPeriod?: string;
    EndPeriod?: string;
    Currency?: string;
  };
  Columns?: unknown;
  Rows?: { Row?: QboReportRow[] };
}

const reportCache = new Map<string, { data: QboReport; expiresAt: number }>();

async function fetchReport(
  name: string,
  params: Record<string, string>,
): Promise<QboReport> {
  const qs = new URLSearchParams(params).toString();
  const key = `${name}?${qs}`;
  const cached = reportCache.get(key);
  if (cached && Date.now() < cached.expiresAt) return cached.data;

  const realmId = await getRealmId();
  const data = await withLimit(async () => {
    const accessToken = await getAccessToken();
    const url = new URL(`${apiBase()}/v3/company/${realmId}/reports/${name}`);
    for (const [k, v] of Object.entries(params)) {
      if (v) url.searchParams.set(k, v);
    }
    url.searchParams.set("minorversion", MINOR_VERSION);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`QuickBooks report ${name} ${res.status}: ${text.slice(0, 200)}`);
    }
    return res.json() as Promise<QboReport>;
  });

  reportCache.set(key, { data, expiresAt: Date.now() + REPORT_TTL_MS });
  return data;
}

/* ── Report helpers (return parsed JSON) ───────────────────────── */
export function getProfitAndLoss(start: string, end: string): Promise<QboReport> {
  return fetchReport("ProfitAndLoss", { start_date: start, end_date: end });
}
export function getBalanceSheet(asOf: string): Promise<QboReport> {
  return fetchReport("BalanceSheet", { end_date: asOf });
}
export function getCashFlow(start: string, end: string): Promise<QboReport> {
  return fetchReport("CashFlow", { start_date: start, end_date: end });
}
export function getArAging(): Promise<QboReport> {
  return fetchReport("AgedReceivables", {});
}
export function getApAging(): Promise<QboReport> {
  return fetchReport("AgedPayables", {});
}

/* ── Report normalization ──────────────────────────────────────── */
function num(v?: string): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function round(n: number, dp = 2): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}
function rowsOf(report: QboReport): QboReportRow[] {
  return report.Rows?.Row ?? [];
}
function lastValue(cd?: QboColData[]): number | null {
  if (!cd || cd.length === 0) return null;
  return num(cd[cd.length - 1]?.value);
}

/** Find the total for a report section identified by its `group` attribute. */
function findGroupTotal(rows: QboReportRow[], group: string): number | null {
  for (const r of rows) {
    if (r.group === group) {
      const fromSummary = lastValue(r.Summary?.ColData);
      if (fromSummary !== null) return fromSummary;
      const fromData = lastValue(r.ColData);
      if (fromData !== null) return fromData;
    }
    const nested = r.Rows?.Row;
    if (nested) {
      const found = findGroupTotal(nested, group);
      if (found !== null) return found;
    }
  }
  return null;
}

function firstGroupTotal(rows: QboReportRow[], groups: string[]): number | null {
  for (const g of groups) {
    const v = findGroupTotal(rows, g);
    if (v !== null) return v;
  }
  return null;
}

export interface PnlCategory {
  name: string;
  amount: number;
  section: string;
}

/** Collect leaf account rows (name + amount) with their section label. */
function collectLeaves(rows: QboReportRow[], section: string, out: PnlCategory[]): void {
  for (const r of rows) {
    const sec = r.group ?? section;
    const nested = r.Rows?.Row;
    if (nested && nested.length > 0) {
      collectLeaves(nested, sec, out);
    } else if (r.ColData && r.ColData.length >= 2) {
      const name = r.ColData[0]?.value ?? "";
      const amount = lastValue(r.ColData) ?? 0;
      if (name) out.push({ name, amount, section: sec });
    }
  }
}

export interface PnlSummary {
  revenue: number;
  cogs: number;
  grossProfit: number;
  expenses: number;
  netIncome: number;
  /** Net income as a percentage of revenue (e.g. 18.3 means 18.3%). */
  netMargin: number;
  byCategory: PnlCategory[];
  period: { start: string; end: string };
}

export function normalizeProfitAndLoss(
  report: QboReport,
  start: string,
  end: string,
): PnlSummary {
  const rows = rowsOf(report);
  const revenue = firstGroupTotal(rows, ["Income", "TotalIncome"]) ?? 0;
  const cogsFound = firstGroupTotal(rows, ["COGS", "TotalCOGS", "CostOfGoodsSold"]);
  // In QBO, GrossProfit = Income − COGS, so each can be derived from the other two.
  const grossProfit = findGroupTotal(rows, "GrossProfit") ?? revenue - (cogsFound ?? 0);
  const cogs = cogsFound ?? revenue - grossProfit;
  const expenses = firstGroupTotal(rows, ["Expenses", "TotalExpenses"]) ?? 0;
  const netIncome = findGroupTotal(rows, "NetIncome") ?? grossProfit - expenses;
  const netMargin = revenue !== 0 ? round((netIncome / revenue) * 100, 1) : 0;

  const byCategory: PnlCategory[] = [];
  collectLeaves(rows, "", byCategory);

  return {
    revenue: round(revenue),
    cogs: round(cogs),
    grossProfit: round(grossProfit),
    expenses: round(expenses),
    netIncome: round(netIncome),
    netMargin,
    byCategory: byCategory.map((c) => ({ ...c, amount: round(c.amount) })),
    period: { start, end },
  };
}

export interface BalanceSheetSummary {
  assets: number;
  liabilities: number;
  equity: number;
  cash: number;
  asOf: string;
}

export function normalizeBalanceSheet(report: QboReport, asOf: string): BalanceSheetSummary {
  const rows = rowsOf(report);
  const assets = firstGroupTotal(rows, ["TotalAssets"]) ?? 0;
  const liabilities = firstGroupTotal(rows, ["TotalLiabilities", "Liabilities"]) ?? 0;
  const equity = firstGroupTotal(rows, ["TotalEquity", "Equity"]) ?? 0;
  const cash = firstGroupTotal(rows, ["BankAccounts", "Bank", "TotalBank"]) ?? 0;
  return {
    assets: round(assets),
    liabilities: round(liabilities),
    equity: round(equity),
    cash: round(cash),
    asOf,
  };
}

/* ── Company info (for /health) — cached 30 min ────────────────── */
interface CompanyInfoResponse {
  QueryResponse?: { CompanyInfo?: Array<{ CompanyName?: string }> };
}
let companyCache: { name: string | null; expiresAt: number } | null = null;

export async function getCompanyName(): Promise<string | null> {
  if (companyCache && Date.now() < companyCache.expiresAt) return companyCache.name;
  const data = await query<CompanyInfoResponse>("select * from CompanyInfo");
  const name = data.QueryResponse?.CompanyInfo?.[0]?.CompanyName ?? null;
  companyCache = { name, expiresAt: Date.now() + COMPANY_TTL_MS };
  return name;
}

/* ── Account queries (existing) ────────────────────────────────── */
export interface QboAccount {
  Id: string;
  Name: string;
  AccountType: string;
  CurrentBalance: number;
  Active?: boolean;
}

interface AccountQueryResponse {
  QueryResponse?: { Account?: QboAccount[] };
}

/** Fetch all Bank-type accounts ordered by QuickBooks' default (Id). */
export async function getBankAccounts(): Promise<QboAccount[]> {
  const data = await query<AccountQueryResponse>(
    "select * from Account where AccountType = 'Bank'",
  );
  return data.QueryResponse?.Account ?? [];
}

/* ── OAuth Authorization Code flow (connect / reconnect) ───────── */
/** Build the Intuit authorize URL the browser is redirected to. */
export function buildAuthorizeUrl(state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: requireEnv("QBO_CLIENT_ID"),
    scope: QBO_SCOPE,
    redirect_uri: redirectUri,
    response_type: "code",
    state,
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

export interface QboTokenExchange {
  refreshToken: string;
  accessToken: string;
  expiresIn: number;
}

/** Exchange an authorization code for tokens (same redirect_uri as authorize). */
export async function exchangeAuthCode(
  code: string,
  redirectUri: string,
): Promise<QboTokenExchange> {
  const clientId = requireEnv("QBO_CLIENT_ID");
  const clientSecret = requireEnv("QBO_CLIENT_SECRET");
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`QuickBooks code exchange ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
  return {
    refreshToken: data.refresh_token,
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  };
}

/** Persist a freshly authorized connection (refresh token + realm) and reset
 *  the in-memory caches so the next call uses the new credentials. */
export async function persistQboConnection(args: {
  refreshToken: string;
  realmId: string;
  accessToken?: string;
  expiresIn?: number;
}): Promise<void> {
  // Invalidate any in-flight refresh of the OLD token chain before we touch
  // shared state, so its completion can't overwrite this fresh connection.
  connectionGeneration += 1;

  await db
    .insert(oauthTokensTable)
    .values({ provider: PROVIDER, refreshToken: args.refreshToken, realmId: args.realmId })
    .onConflictDoUpdate({
      target: oauthTokensTable.provider,
      set: { refreshToken: args.refreshToken, realmId: args.realmId },
    });

  cachedRealmId = args.realmId;
  needsReauth = false;
  companyCache = null; // re-fetch the (possibly new) company name on next /health
  reportCache.clear();

  if (args.accessToken && args.expiresIn) {
    lastRefresh = new Date().toISOString();
    accessTokenCache = {
      token: args.accessToken,
      expiresAt: Date.now() + Math.max(0, args.expiresIn * 1000 - ACCESS_TOKEN_SKEW_MS),
    };
  } else {
    accessTokenCache = null;
  }
}
