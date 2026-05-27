import { Router, type IRouter, type Request, type Response } from "express";
import twilio from "twilio";
import { promises as fs } from "node:fs";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";

/* ── File-backed message store ───────────────────────────────────
   Messages are persisted to ./data/messages.json so they survive
   server restarts and deployments. Reads are served from an
   in-memory mirror for speed; writes go to both. */
export interface WaMessage {
  id: string;
  from: string;
  name: string;
  body: string;
  timestamp: string;
  status: "new" | "read";
}

const DATA_DIR = path.join(process.cwd(), "data");
const MESSAGES_FILE = path.join(DATA_DIR, "messages.json");

function loadMessagesSync(): WaMessage[] {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    if (!existsSync(MESSAGES_FILE)) return [];
    const raw = readFileSync(MESSAGES_FILE, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as WaMessage[]) : [];
  } catch (err) {
    console.error("Failed to load messages.json — starting empty:", err);
    return [];
  }
}

const messages: WaMessage[] = loadMessagesSync();
let lastInboundAt: string | null =
  messages.find((m) => m.name !== "You")?.timestamp ?? null;

/* Serialise writes so concurrent webhook bursts don't clobber the file. */
let writeChain: Promise<void> = Promise.resolve();
function persistMessages(): void {
  writeChain = writeChain
    .then(async () => {
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(MESSAGES_FILE, JSON.stringify(messages, null, 2), "utf8");
    })
    .catch((err) => {
      console.error("Failed to write messages.json:", err);
    });
}

const router: IRouter = Router();

/* ── TwiML helpers ──────────────────────────────────────────────
   Twilio's webhook validator and message pipeline both expect a
   well-formed TwiML MessagingResponse with the XML prolog, served
   as text/xml. An empty <Response/> tells Twilio "I handled it,
   send no auto-reply." */
const EMPTY_TWIML =
  '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';

function logWebhookHit(req: Request): void {
  console.log("WEBHOOK METHOD:", req.method);
  console.log("WEBHOOK BODY:", JSON.stringify(req.body));
  console.log("WEBHOOK QUERY:", JSON.stringify(req.query));
}

/* ── GET /webhooks/whatsapp ──────────────────────────────────────
   Twilio sometimes issues a GET to verify the endpoint before
   sending real POSTs. Respond with valid TwiML so the URL passes
   Twilio's reachability check. */
router.get("/webhooks/whatsapp", (req: Request, res: Response) => {
  logWebhookHit(req);
  res.set("Content-Type", "text/xml");
  res.status(200).send(EMPTY_TWIML);
});

/* ── POST /webhooks/whatsapp ─────────────────────────────────── */
router.post("/webhooks/whatsapp", (req: Request, res: Response) => {
  logWebhookHit(req);

  /* Acknowledge Twilio FIRST with a valid TwiML MessagingResponse,
     BEFORE any async processing. If we ever throw downstream,
     Twilio has already seen a 200 + valid XML and won't retry. */
  res.set("Content-Type", "text/xml");
  res.status(200).send(EMPTY_TWIML);

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
    lastInboundAt = msg.timestamp;
    persistMessages();
    req.log.info({ from, name: msg.name }, "WhatsApp message received");
  } catch (err) {
    req.log.error({ err }, "Failed to process WhatsApp webhook body");
  }
});

/* ── POST /dispatch/messages/clear (admin) ──────────────────────
   Wipes the persisted message store. Useful when test or stale
   threads are polluting the dispatch list in production. */
router.post("/dispatch/messages/clear", (req: Request, res: Response) => {
  const removed = messages.length;
  messages.length = 0;
  lastInboundAt = null;
  persistMessages();
  req.log.info({ removed }, "Dispatch message store cleared");
  res.json({ ok: true, removed });
});

/* ── GET /dispatch/status ───────────────────────────────────────
   Lightweight health endpoint for the Dispatch "Connected" dot.
   `isReceiving` is true if any inbound WhatsApp message has
   landed within the last 5 minutes. */
router.get("/dispatch/status", (_req: Request, res: Response) => {
  const FIVE_MIN_MS = 5 * 60 * 1000;
  const isReceiving =
    lastInboundAt !== null && Date.now() - new Date(lastInboundAt).getTime() < FIVE_MIN_MS;
  res.json({
    isReceiving,
    lastInboundAt,
    totalMessages: messages.length,
  });
});

/* ── GET /dispatch/messages ──────────────────────────────────────
   Reads from the SAME `messages` array that the webhook writes to.
   That array is the in-memory mirror of ./data/messages.json — both
   the webhook write and this poll read share it, so there is no
   "two arrays" drift. */
router.get("/dispatch/messages", (_req: Request, res: Response) => {
  const sorted = [...messages].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  console.log("POLL: returning", messages.length, "messages");
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
    persistMessages();

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
