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
    const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER;

    console.log("SID exists:", !!accountSid);
    console.log("Token exists:", !!authToken);
    console.log("From:", fromNumber);
    console.log("To raw:", req.body.to);

    if (!accountSid || !authToken) {
      res.status(500).json({
        success: false,
        error: "Twilio credentials missing from secrets",
        help: "Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_NUMBER in Secrets.",
      });
      return;
    }

    const client = twilio(accountSid, authToken);

    let to: string = req.body.to || "";
    to = to.replace("whatsapp:", "");
    to = to.replace(/[\s\-()]/g, "");
    if (!to.startsWith("+")) to = "+" + to;
    const toNumberPlain = to;
    to = "whatsapp:" + to;

    let from: string = fromNumber || "";
    if (!from.startsWith("whatsapp:")) from = "whatsapp:" + from;

    console.log("Sending from:", from);
    console.log("Sending to:", to);
    console.log("Message:", req.body.message);

    const message = await client.messages.create({
      from: from,
      to: to,
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
