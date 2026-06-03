import { Router, type IRouter } from "express";
import { randomBytes } from "node:crypto";
import {
  buildAuthorizeUrl,
  exchangeAuthCode,
  persistQboConnection,
  getCompanyName,
} from "../lib/quickbooks.js";

const router: IRouter = Router();

/* The redirect URI must match exactly what is registered in the Intuit app
   settings AND be identical on both the authorize redirect and the token
   exchange. Defaults to the production callback; overridable for other hosts. */
const REDIRECT_URI =
  process.env.QBO_REDIRECT_URI ??
  "https://kwik-command-center.replit.app/api/auth/quickbooks/callback";

const STATE_COOKIE = "qbo_oauth_state";
const STATE_COOKIE_PATH = "/api/auth/quickbooks";
const ADMIN_PAGE = "/settings";

/** Minimal cookie reader (no cookie-parser dependency in this app). */
function readCookie(header: string | undefined, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    if (key === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return null;
}

/* GET /api/auth/quickbooks — kick off the OAuth Authorization Code flow. */
router.get("/auth/quickbooks", (_req, res) => {
  const state = randomBytes(16).toString("hex");
  res.cookie(STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 10 * 60 * 1000,
    path: STATE_COOKIE_PATH,
  });
  res.redirect(buildAuthorizeUrl(state, REDIRECT_URI));
});

/* GET /api/auth/quickbooks/callback — validate state, exchange code, persist. */
router.get("/auth/quickbooks/callback", async (req, res) => {
  const q = req.query as Record<string, string | undefined>;
  try {
    if (q.error) {
      throw new Error(`QuickBooks authorization denied: ${q.error}`);
    }

    const expected = readCookie(req.headers.cookie, STATE_COOKIE);
    res.clearCookie(STATE_COOKIE, { path: STATE_COOKIE_PATH });

    if (!q.state || !expected || q.state !== expected) {
      throw new Error("Invalid OAuth state");
    }
    if (!q.code) throw new Error("Missing authorization code");
    if (!q.realmId) throw new Error("Missing realmId");

    const tokens = await exchangeAuthCode(q.code, REDIRECT_URI);
    await persistQboConnection({
      refreshToken: tokens.refreshToken,
      realmId: q.realmId,
      accessToken: tokens.accessToken,
      expiresIn: tokens.expiresIn,
    });

    let companyName: string | null = null;
    try {
      companyName = await getCompanyName();
    } catch (err) {
      req.log.warn({ err }, "quickbooks connected but company-name lookup failed");
    }

    const params = new URLSearchParams({ qbo: "connected" });
    if (companyName) params.set("company", companyName);
    res.redirect(`${ADMIN_PAGE}?${params.toString()}`);
  } catch (err) {
    req.log.error({ err }, "quickbooks oauth callback failed");
    const message = err instanceof Error ? err.message : String(err);
    res.redirect(`${ADMIN_PAGE}?qbo=error&message=${encodeURIComponent(message)}`);
  }
});

export default router;
