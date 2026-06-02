import { Router, type IRouter, type Request, type Response } from "express";
import twilio from "twilio";
import { db, messagesTable } from "@workspace/db";
import { desc, eq, sql } from "drizzle-orm";

/* ── Postgres-backed message store ───────────────────────────────
   Inbound WhatsApp messages and outbound replies are persisted to
   the `messages` table so they survive server restarts and
   deployments. There is no file-based or in-memory mirror — the
   database is the single source of truth. */
export interface WaMessage {
  id: string;
  from: string;
  name: string;
  body: string;
  timestamp: string;
  status: "new" | "read";
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
router.post("/webhooks/whatsapp", async (req: Request, res: Response) => {
  logWebhookHit(req);

  /* Durability contract: persist to Postgres BEFORE acking Twilio.
     The DB is the source of truth, so if the write fails we must
     return a non-2xx and let Twilio retry rather than ack a message
     we never stored. onConflictDoNothing on the MessageSid makes
     those retries idempotent (no duplicate rows). */
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
    const id = body.MessageSid ?? `msg-${Date.now()}`;
    const name = body.ProfileName ?? from;

    await db
      .insert(messagesTable)
      .values({
        id,
        from,
        name,
        body: body.Body ?? "",
        timestamp: new Date(),
        status: "new",
      })
      .onConflictDoNothing({ target: messagesTable.id });

    req.log.info({ from, name }, "WhatsApp message received");
    res.set("Content-Type", "text/xml");
    res.status(200).send(EMPTY_TWIML);
  } catch (err) {
    req.log.error({ err }, "Failed to persist WhatsApp webhook message");
    /* Non-2xx → Twilio retries; the message is not yet stored. */
    res.status(500).send("Failed to store message");
  }
});

/* ── POST /dispatch/messages/clear (admin) ──────────────────────
   Wipes the persisted message store. Useful when test or stale
   threads are polluting the dispatch list in production. */
function toWaMessage(row: typeof messagesTable.$inferSelect): WaMessage {
  return {
    id: row.id,
    from: row.from,
    name: row.name,
    body: row.body,
    timestamp: row.timestamp.toISOString(),
    status: row.status,
  };
}

router.post("/dispatch/messages/clear", async (req: Request, res: Response) => {
  try {
    const removed = await db.delete(messagesTable).returning({ id: messagesTable.id });
    req.log.info({ removed: removed.length }, "Dispatch message store cleared");
    res.json({ ok: true, removed: removed.length });
  } catch (err) {
    req.log.error({ err }, "Failed to clear dispatch message store");
    res.status(500).json({ ok: false, error: "Failed to clear message store" });
  }
});

/* ── GET /dispatch/status ───────────────────────────────────────
   Lightweight health endpoint for the Dispatch "Connected" dot.
   `isReceiving` is true if any inbound WhatsApp message has
   landed within the last 5 minutes. */
router.get("/dispatch/status", async (req: Request, res: Response) => {
  try {
    const FIVE_MIN_MS = 5 * 60 * 1000;
    const [row] = await db
      .select({
        total: sql<number>`count(*)::int`,
        lastInbound: sql<Date | null>`max("timestamp") filter (where "name" <> 'You')`,
      })
      .from(messagesTable);
    const lastInboundAt = row?.lastInbound ? new Date(row.lastInbound).toISOString() : null;
    const isReceiving =
      lastInboundAt !== null &&
      Date.now() - new Date(lastInboundAt).getTime() < FIVE_MIN_MS;
    res.json({
      isReceiving,
      lastInboundAt,
      totalMessages: row?.total ?? 0,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to read dispatch status");
    res.status(500).json({ isReceiving: false, lastInboundAt: null, totalMessages: 0 });
  }
});

/* ── GET /dispatch/messages ──────────────────────────────────────
   Reads from the `messages` table — the single source of truth that
   the webhook and outbound send both write to. */
router.get("/dispatch/messages", async (req: Request, res: Response) => {
  try {
    const rows = await db
      .select()
      .from(messagesTable)
      .orderBy(desc(messagesTable.timestamp));
    res.json(rows.map(toWaMessage));
  } catch (err) {
    req.log.error({ err }, "Failed to read dispatch messages");
    res.status(500).json([]);
  }
});

/* ── POST /dispatch/messages/:id/read ───────────────────────── */
router.post("/dispatch/messages/:id/read", async (req: Request, res: Response) => {
  try {
    const id = String(req.params["id"] ?? "");
    await db.update(messagesTable).set({ status: "read" }).where(eq(messagesTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to mark message read");
    res.status(500).json({ ok: false });
  }
});

/* ── POST /dispatch/send ─────────────────────────────────────── */
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

    /* Also store the outbound message so it appears in the thread */
    await db
      .insert(messagesTable)
      .values({
        id: message.sid,
        from: toNumberPlain,
        name: "You",
        body: req.body.message || "Test message from Kwik Dry",
        timestamp: new Date(),
        status: "read",
      })
      .onConflictDoNothing({ target: messagesTable.id });

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
