// QuickBooks Online access via OAuth2.
// Refresh tokens ROTATE: each refresh may return a new refresh token and the
// old one is invalidated. We persist the latest refresh token in the DB so the
// integration keeps working across server restarts. The access token is cached
// in memory until shortly before it expires to avoid unnecessary rotation.
import { db, oauthTokensTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const PROVIDER = "quickbooks";
const TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
const MINOR_VERSION = "73";

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

/* ── Refresh-token persistence ─────────────────────────────────── */
async function loadRefreshToken(): Promise<string> {
  const rows = await db
    .select()
    .from(oauthTokensTable)
    .where(eq(oauthTokensTable.provider, PROVIDER))
    .limit(1);
  if (rows[0]?.refreshToken) return rows[0].refreshToken;
  // Seed from env on first run.
  return requireEnv("QBO_REFRESH_TOKEN");
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

async function getAccessToken(): Promise<string> {
  if (accessTokenCache && Date.now() < accessTokenCache.expiresAt) {
    return accessTokenCache.token;
  }

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
    throw new Error(`QuickBooks token refresh ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  // Persist the (possibly rotated) refresh token for next time.
  if (data.refresh_token) {
    await saveRefreshToken(data.refresh_token);
  }

  accessTokenCache = {
    token: data.access_token,
    // Refresh 60s before actual expiry.
    expiresAt: Date.now() + Math.max(0, (data.expires_in - 60) * 1000),
  };
  return accessTokenCache.token;
}

/* ── Query helper ──────────────────────────────────────────────── */
async function query<T>(statement: string): Promise<T> {
  const realmId = requireEnv("QBO_REALM_ID");
  const accessToken = await getAccessToken();
  const url = new URL(`${apiBase()}/v3/company/${realmId}/query`);
  url.searchParams.set("query", statement);
  url.searchParams.set("minorversion", MINOR_VERSION);

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`QuickBooks query ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

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
