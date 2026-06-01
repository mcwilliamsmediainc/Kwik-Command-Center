import { Router, type IRouter } from "express";
import { getBankAccounts } from "../lib/quickbooks.js";

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

export default router;
