import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();

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
