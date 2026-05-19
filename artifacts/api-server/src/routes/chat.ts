import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();

/* ── Daily Ryder session counter (resets at midnight) ─────────── */
let _counterDate = "";
let _ryderSessions = 0;
function todayStr() { return new Date().toISOString().slice(0, 10); }
function checkReset() {
  const today = todayStr();
  if (today !== _counterDate) { _counterDate = today; _ryderSessions = 0; }
}

/* ── GET /api/stats/today ─────────────────────────────────────── */
router.get("/stats/today", (req: Request, res: Response) => {
  checkReset();
  res.json({ ryderSessions: _ryderSessions, date: _counterDate || todayStr() });
});

/* ── POST /api/chat ───────────────────────────────────────────── */
router.post("/chat", async (req: Request, res: Response) => {
  const apiKey = process.env.ANTHROPIC_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "ANTHROPIC_KEY is not configured on the server." });
    return;
  }

  const { messages, system } = req.body as {
    messages: Array<{ role: string; content: string }>;
    system?: string;
  };

  if (!messages || !Array.isArray(messages)) {
    res.status(400).json({ error: "messages array is required." });
    return;
  }

  /* Count every chat call as a Ryder session */
  checkReset();
  _ryderSessions++;

  try {
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 512,
        ...(system ? { system } : {}),
        messages,
      }),
    });

    const data = await anthropicRes.json();

    if (!anthropicRes.ok) {
      res.status(anthropicRes.status).json({ error: (data as { error?: { message?: string } }).error?.message ?? "Anthropic API error" });
      return;
    }

    res.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

export default router;
