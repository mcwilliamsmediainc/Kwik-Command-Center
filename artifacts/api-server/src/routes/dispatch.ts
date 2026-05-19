import { Router, type IRouter, type Request, type Response } from "express";
import twilio from "twilio";

/* ── In-memory message store ─────────────────────────────────── */
export interface WaMessage {
  id: string;
  from: string;
  name: string;
  body: string;
  timestamp: string;
  status: "new" | "read";
}

const messages: WaMessage[] = [];

const router: IRouter = Router();

/* ── POST /webhooks/whatsapp ─────────────────────────────────── */
router.post("/webhooks/whatsapp", (req: Request, res: Response) => {
  const { From, Body, ProfileName, MessageSid } = req.body as {
    From?: string;
    Body?: string;
    ProfileName?: string;
    MessageSid?: string;
  };

  const from = (From ?? "").replace(/^whatsapp:/, "");
  const msg: WaMessage = {
    id: MessageSid ?? `msg-${Date.now()}`,
    from,
    name: ProfileName ?? from,
    body: Body ?? "",
    timestamp: new Date().toISOString(),
    status: "new",
  };

  messages.unshift(msg);
  req.log.info({ from, name: msg.name }, "WhatsApp message received");

  res.set("Content-Type", "text/xml");
  res.send("<Response></Response>");
});

/* ── GET /dispatch/messages ──────────────────────────────────── */
router.get("/dispatch/messages", (_req: Request, res: Response) => {
  const sorted = [...messages].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  res.json(sorted);
});

/* ── POST /dispatch/messages/:id/read ───────────────────────── */
router.post("/dispatch/messages/:id/read", (req: Request, res: Response) => {
  const msg = messages.find((m) => m.id === req.params["id"]);
  if (msg) msg.status = "read";
  res.json({ ok: true });
});

/* ── POST /dispatch/send ─────────────────────────────────────── */
router.post("/dispatch/send", async (req: Request, res: Response) => {
  const { to, message } = req.body as { to?: string; message?: string };

  if (!to || !message) {
    res.status(400).json({ error: "to and message are required" });
    return;
  }

  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from  = process.env.TWILIO_WHATSAPP_NUMBER;

  if (!sid || !token || !from) {
    res.status(503).json({ error: "Twilio credentials not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER)" });
    return;
  }

  try {
    const client = twilio(sid, token);
    const result = await client.messages.create({
      from: from.startsWith("whatsapp:") ? from : `whatsapp:${from}`,
      to:   to.startsWith("whatsapp:")   ? to   : `whatsapp:${to}`,
      body: message,
    });

    /* Also store the outbound message locally so it appears in the thread */
    messages.unshift({
      id: result.sid,
      from: to,
      name: "You",
      body: message,
      timestamp: new Date().toISOString(),
      status: "read",
    });

    req.log.info({ to, sid: result.sid }, "WhatsApp message sent");
    res.json({ success: true, sid: result.sid });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Unknown error";
    req.log.error({ err }, "Failed to send WhatsApp message");
    res.status(500).json({ error: errMsg });
  }
});

export default router;
