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
  const { to: toRaw, message } = req.body as { to?: string; message?: string };

  /* ── TWILIO SEND DEBUG (visible in deployment logs as structured pino entries) ── */
  req.log.info(
    {
      toRaw,
      messagePreview: message ? message.slice(0, 80) : null,
      accountSidPrefix: process.env.TWILIO_ACCOUNT_SID?.slice(0, 10),
      authTokenSet: !!process.env.TWILIO_AUTH_TOKEN,
      whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER,
    },
    "=== TWILIO SEND DEBUG ==="
  );

  if (!toRaw || !message) {
    res.status(400).json({
      success: false,
      error: "to and message are required",
      help: 'Request body must include both "to" and "message".',
    });
    return;
  }

  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const fromRaw = process.env.TWILIO_WHATSAPP_NUMBER;

  if (!sid || !token || !fromRaw) {
    res.status(503).json({
      success: false,
      error: "Twilio credentials not configured",
      help: "Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_NUMBER in Secrets.",
    });
    return;
  }

  /* ── Format "to": strip whatsapp:, strip spaces/dashes/parens, ensure +, re-prefix ── */
  let toNumber = toRaw.replace("whatsapp:", "");
  toNumber = toNumber.replace(/[\s\-()]/g, "");
  if (!toNumber.startsWith("+")) toNumber = "+" + toNumber;
  const formattedTo = "whatsapp:" + toNumber;

  /* ── Format "from": ensure whatsapp: prefix ── */
  let fromNumber = fromRaw;
  if (!fromNumber.startsWith("whatsapp:")) fromNumber = "whatsapp:" + fromNumber;

  req.log.info({ formattedTo, fromNumber }, "Twilio formatted numbers");

  try {
    const client = twilio(sid, token);
    const result = await client.messages.create({
      from: fromNumber,
      to: formattedTo,
      body: message,
    });

    /* Also store the outbound message locally so it appears in the thread */
    messages.unshift({
      id: result.sid,
      from: toNumber,
      name: "You",
      body: message,
      timestamp: new Date().toISOString(),
      status: "read",
    });

    req.log.info({ messageSid: result.sid }, "Twilio message SID");
    res.json({ success: true, sid: result.sid });
  } catch (err) {
    const e = err as {
      code?: number;
      status?: number;
      message?: string;
      moreInfo?: string;
    };
    req.log.error(
      {
        twilioCode: e.code,
        twilioMessage: e.message,
        twilioMoreInfo: e.moreInfo,
        formattedTo,
        fromNumber,
      },
      "Twilio send failed"
    );

    const errMsg = e.message ?? (err instanceof Error ? err.message : "Unknown error");
    /* Use 400 for known recipient-opt-in errors so the UI treats them as user-fixable */
    const status = e.code === 63016 || e.code === 21608 ? 400 : 500;
    res.status(status).json({
      success: false,
      error: errMsg,
      code: e.code,
      help: twilioHelpFor(e.code),
    });
  }
});

export default router;
