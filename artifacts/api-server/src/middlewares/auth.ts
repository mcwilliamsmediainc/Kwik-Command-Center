import type { Request, Response, NextFunction } from "express";
import { timingSafeEqual } from "node:crypto";

const REALM = "Tulsa Kwik Dry Command Center";

/** Constant-time string comparison that tolerates differing lengths. */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Extract the shared key presented by the caller, accepting either:
 *  - the `x-api-key` header (programmatic clients + the SPA's fetch wrapper), or
 *  - the password component of HTTP Basic auth (browser top-level navigations,
 *    e.g. the "Reconnect QuickBooks" link, where headers cannot be set).
 */
function presentedKey(req: Request): string | null {
  const header = req.get("x-api-key");
  if (header) return header;

  const authorization = req.get("authorization");
  if (authorization && authorization.startsWith("Basic ")) {
    try {
      const decoded = Buffer.from(authorization.slice(6), "base64").toString("utf8");
      const idx = decoded.indexOf(":");
      return idx === -1 ? decoded : decoded.slice(idx + 1);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Gate that requires a valid shared secret (`COMMAND_CENTER_API_KEY`).
 *
 * Fails closed: if the secret is not configured the server refuses protected
 * traffic rather than running wide open. For browser navigations (Accept:
 * text/html) it returns a `WWW-Authenticate: Basic` challenge so the browser
 * shows a native login prompt; for XHR/fetch it returns a plain JSON 401 the
 * SPA can handle without a spurious browser dialog.
 */
export function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  const expected = process.env.COMMAND_CENTER_API_KEY;
  if (!expected) {
    req.log.error(
      "COMMAND_CENTER_API_KEY is not configured — refusing all protected requests",
    );
    res.status(503).json({ error: "Server authentication is not configured." });
    return;
  }

  const provided = presentedKey(req);
  if (provided && safeEqual(provided, expected)) {
    next();
    return;
  }

  const acceptsHtml = (req.get("accept") ?? "").includes("text/html");
  if (acceptsHtml) {
    res.set("WWW-Authenticate", `Basic realm="${REALM}", charset="UTF-8"`);
  }
  res.status(401).json({ error: "Unauthorized — a valid x-api-key is required." });
}
