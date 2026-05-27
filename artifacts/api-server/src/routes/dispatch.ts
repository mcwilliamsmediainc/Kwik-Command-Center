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
  /* Log the full raw payload so we can inspect the exact shape Twilio
     sends (Messaging Service payloads can vary slightly from
     direct-number ones — e.g. MessagingServiceSid present, From may
     be a group). */
  console.log("RAW WEBHOOK BODY:", JSON.stringify(req.body, null, 2));

  /* Acknowledge Twilio immediately so the request never times out, no
     matter what our downstream processing does. */
  res.set("Content-Type", "text/xml");
  res.status(200).send("<Response></Response>");

  /* ── Process after the response is sent ── */
  try {
    const body = req.body as {
      From?: string;
      Body?: string;
      ProfileName?: string;
      MessageSid?: string;
      WaId?: string;
    };
    const fromRaw = body.From ?? body.WaId ?? "";
    const from = fromRaw.replace(/^whatsapp:/, "");
    const msg: WaMessage = {
      id: body.MessageSid ?? `msg-${Date.now()}`,
      from,
      name: body.ProfileName ?? from,
      body: body.Body ?? "",
      timestamp: new Date().toISOString(),
      status: "new",
    };

    messages.unshift(msg);
    req.log.info({ from, name: msg.name }, "WhatsApp message received");
  } catch (err) {
    req.log.error({ err }, "Failed to process WhatsApp webhook body");
  }
});

/* ── POST /dispatch/messages/clear ───────────────────────────────
   Wipes the in-memory message store. Useful when test or stale
   threads (e.g. from curl probes) are polluting the dispatch list
   in production. In-memory only; no DB. */
router.post("/dispatch/messages/clear", (req: Request, res: Response) => {
  const removed = messages.length;
  messages.length = 0;
  req.log.info({ removed }, "Dispatch message store cleared");
  res.json({ ok: true, removed });
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
function toWhatsApp(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("whatsapp:")) return trimmed;
  /* Ensure leading + so Twilio accepts E.164 */
  const withPlus = trimmed.startsWith("+") ? trimmed : `+${trimmed.replace(/^[^\d]*/, "")}`;
  return `whatsapp:${withPlus}`;
}

function twilioHelpFor(code: number | undefined): string {
  if (code === 63016) {
    return 'Recipient must join sandbox. Have them text "join [your-sandbox-word]" to +1 415 523 8886';
  }
  if (code === 21608) {
    return "This number is not opted in to the WhatsApp sandbox";
  }
  return "Check Twilio console for details";
}

router.post("/dispatch/send", async (req: Request, res: Response) => {
  try {
    console.log("DISPATCH SEND CALLED");
    console.log("Body:", JSON.stringify(req.body));

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

    console.log("SID exists:", !!accountSid);
    console.log("Token exists:", !!authToken);
    console.log("Messaging Service SID exists:", !!messagingServiceSid);
    console.log("To raw:", req.body.to);

    if (!accountSid || !authToken || !messagingServiceSid) {
      res.status(500).json({
        success: false,
        error: "Twilio credentials missing from secrets",
        help: "Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_MESSAGING_SERVICE_SID in Secrets.",
      });
      return;
    }

    const client = twilio(accountSid, authToken);

    let to: string = req.body.to || "";
    to = to.replace("whatsapp:", "");
    to = to.replace(/[\s\-()]/g, "");
    if (!to.startsWith("+")) to = "+" + to;
    const toNumberPlain = to;
    const formattedTo = "whatsapp:" + to;

    console.log("Sending via Messaging Service:", messagingServiceSid);
    console.log("Sending to:", formattedTo);
    console.log("Message:", req.body.message);

    const message = await client.messages.create({
      messagingServiceSid,
      to: formattedTo,
      body: req.body.message || "Test message from Kwik Dry",
    });

    /* Also store the outbound message locally so it appears in the thread */
    messages.unshift({
      id: message.sid,
      from: toNumberPlain,
      name: "You",
      body: req.body.message || "Test message from Kwik Dry",
      timestamp: new Date().toISOString(),
      status: "read",
    });

    console.log("SUCCESS - SID:", message.sid);
    res.json({ success: true, sid: message.sid });
  } catch (err) {
    const e = err as { code?: number; message?: string; moreInfo?: string };
    console.log("TWILIO ERROR CAUGHT");
    console.log("Error code:", e.code);
    console.log("Error message:", e.message);
    console.log("Error moreInfo:", e.moreInfo);

    const status = e.code === 63016 || e.code === 21608 ? 400 : 500;
    res.status(status).json({
      success: false,
      error: e.message ?? (err instanceof Error ? err.message : "Unknown error"),
      code: e.code,
      help: twilioHelpFor(e.code),
    });
  }
});

export default router;
