import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();

/* ── POST /voice ─────────────────────────────────────────────────
   Twilio Voice webhook → Retell bridge.
   Twilio POSTs the standard voice form fields when a call comes in;
   we register the call with Retell's /v2/create-phone-call and
   return TwiML that connects Twilio's audio leg to Retell's media
   websocket. */
router.post("/voice", async (req: Request, res: Response) => {
  console.log("VOICE WEBHOOK HIT at", new Date().toISOString());
  console.log("Twilio body:", JSON.stringify(req.body));

  const apiKey = process.env["RETELL_API_KEY"];
  const agentId = process.env["RETELL_AGENT_ID"];
  if (!apiKey || !agentId) {
    console.error("Retell secrets missing", { hasKey: !!apiKey, hasAgent: !!agentId });
    res.set("Content-Type", "text/xml");
    res.status(200).send(
      '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Voice service is not configured.</Say><Hangup/></Response>'
    );
    return;
  }

  const body = req.body as { From?: string; To?: string };

  try {
    const retellRes = await fetch("https://api.retellai.com/v2/create-phone-call", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        agent_id: agentId,
        from_number: body.From ?? "",
        to_number: body.To ?? "",
        metadata: {},
      }),
    });

    const text = await retellRes.text();
    console.log("Retell status:", retellRes.status);
    console.log("Retell response:", text);

    if (!retellRes.ok) {
      res.set("Content-Type", "text/xml");
      res.status(200).send(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Sorry, we could not connect your call right now. Please try again later.</Say><Hangup/></Response>'
      );
      return;
    }

    const parsed = JSON.parse(text) as { call_id?: string };
    const callId = parsed.call_id ?? "";
    const twiml =
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<Response>' +
      '<Connect>' +
      `<Stream url="wss://api.retellai.com/audio-websocket/${callId}">` +
      '<Parameter name="sample_rate" value="8000"/>' +
      '</Stream>' +
      '</Connect>' +
      '</Response>';
    res.set("Content-Type", "text/xml");
    res.status(200).send(twiml);
  } catch (err) {
    console.error("Voice bridge error:", err);
    res.set("Content-Type", "text/xml");
    res.status(200).send(
      '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Sorry, an unexpected error occurred. Please try again.</Say><Hangup/></Response>'
    );
  }
});

/* ── POST /retell-voice ──────────────────────────────────────────
   Bridge endpoint: receives a Twilio Voice webhook, asks Retell to
   register a phone call, and returns TwiML that Twilio will execute
   to connect the live audio leg to Retell's media stream.

   Retell's /v2/create-phone-call returns JSON; for Twilio to actually
   bridge the call we wrap Retell's `call_id` in a <Connect><Stream/>
   TwiML payload (Retell's standard inbound-bridge pattern). If Retell
   itself returns an error, we surface it as a TwiML <Say> + <Hangup>
   so the caller hears something instead of dead air. */
router.post("/retell-voice", async (req: Request, res: Response) => {
  console.log("RETELL VOICE HIT at", new Date().toISOString());
  console.log("Twilio body:", JSON.stringify(req.body));

  const apiKey = process.env["RETELL_API_KEY"];
  if (!apiKey) {
    console.error("RETELL_API_KEY missing");
    res.set("Content-Type", "text/xml");
    res.status(200).send(
      '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Voice service is not configured.</Say><Hangup/></Response>'
    );
    return;
  }

  const twilioBody = req.body as {
    From?: string;
    To?: string;
    CallSid?: string;
  };

  try {
    const retellRes = await fetch("https://api.retellai.com/v2/create-phone-call", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from_number: twilioBody.To ?? "",
        to_number: twilioBody.From ?? "",
      }),
    });

    const text = await retellRes.text();
    console.log("Retell status:", retellRes.status);
    console.log("Retell response:", text);

    if (!retellRes.ok) {
      res.set("Content-Type", "text/xml");
      res.status(200).send(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Sorry, we could not connect your call right now. Please try again later.</Say><Hangup/></Response>'
      );
      return;
    }

    /* If Retell ever returns raw TwiML, just pass it through. */
    const trimmed = text.trim();
    if (trimmed.startsWith("<")) {
      res.set("Content-Type", "text/xml");
      res.status(200).send(trimmed);
      return;
    }

    /* Otherwise parse JSON, expect { call_id, ... } and emit a bridge TwiML. */
    const parsed = JSON.parse(text) as { call_id?: string };
    const callId = parsed.call_id ?? "";
    const streamUrl = `wss://api.retellai.com/audio-websocket/${callId}`;
    const twiml =
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<Response><Connect>' +
      `<Stream url="${streamUrl}"/>` +
      '</Connect></Response>';
    res.set("Content-Type", "text/xml");
    res.status(200).send(twiml);
  } catch (err) {
    console.error("Retell bridge error:", err);
    res.set("Content-Type", "text/xml");
    res.status(200).send(
      '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Sorry, an unexpected error occurred. Please try again.</Say><Hangup/></Response>'
    );
  }
});

export default router;
