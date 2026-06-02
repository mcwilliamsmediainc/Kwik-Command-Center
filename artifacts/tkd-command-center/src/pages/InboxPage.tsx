import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useProfile } from "@/context/ProfileContext";
import { useToast } from "@/hooks/use-toast";
import {
  MessageCircle, Mail, Facebook, Send, Edit, UserCheck, Bot,
  Search, ArrowLeft, Wifi, WifiOff,
} from "lucide-react";

/* ─── Types ──────────────────────────────────────────────────── */
interface Msg { id: string; from: "customer" | "agent"; text: string }
interface Thread {
  id: string; customer: string; initials: string;
  channel: "whatsapp" | "sms" | "facebook" | "email";
  preview: string; time: string;
  badge: "needs-approval" | "escalated" | "sent" | "answered" | "pending";
  phone: string; draftContext: string; messages: Msg[];
  hasNew?: boolean;
}

interface WaMessage {
  id: string;
  from: string;
  name: string;
  body: string;
  timestamp: string;
  status: "new" | "read";
}

/* ─── Helpers ─────────────────────────────────────────────────── */
function fmtTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMins = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffMins < 1440) {
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function initialsOf(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

/* Build Thread objects from flat WaMessage list (grouped by sender).
   Mirrors DispatchPage.buildThreads so both inboxes agree on grouping,
   ordering and badges. */
function buildThreads(msgs: WaMessage[]): Thread[] {
  const map = new Map<string, { name: string; msgs: WaMessage[] }>();
  for (const m of msgs) {
    if (!map.has(m.from)) map.set(m.from, { name: m.name, msgs: [] });
    map.get(m.from)!.msgs.push(m);
  }

  return Array.from(map.entries())
    .map(([from, { name, msgs: threadMsgs }]) => {
      const sorted = [...threadMsgs].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      const hasNew = sorted.some((m) => m.status === "new" && m.name !== "You");
      const latest = sorted[0];

      const messages: Msg[] = [...threadMsgs]
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        .map((m) => ({
          id: m.id,
          from: m.name === "You" ? ("agent" as const) : ("customer" as const),
          text: m.body,
        }));

      return {
        id: from,
        customer: name,
        initials: initialsOf(name),
        channel: "whatsapp" as const,
        preview: latest.body.slice(0, 48) + (latest.body.length > 48 ? "…" : ""),
        time: fmtTime(latest.timestamp),
        badge: (hasNew ? "needs-approval" : "answered") as Thread["badge"],
        phone: from,
        draftContext: `Customer ${name} (${from}): ${latest.body}`,
        messages,
        hasNew,
      };
    })
    .sort((a, b) => {
      if (a.hasNew && !b.hasNew) return -1;
      if (!a.hasNew && b.hasNew) return 1;
      const aLatest = a.messages.length > 0 ? a.messages[a.messages.length - 1].id : "";
      const bLatest = b.messages.length > 0 ? b.messages[b.messages.length - 1].id : "";
      return bLatest.localeCompare(aLatest);
    });
}

/* ─── Demo fallback threads (shown only when zero real WhatsApp
   messages exist). Phone numbers are illustrative and are NEVER used
   as a reply target — handleSend short-circuits when usingReal=false. */
const MOCK_THREADS: Thread[] = [
  {
    id: "1", customer: "Sandra Williams", initials: "SW", channel: "whatsapp",
    preview: "Pricing — L-shaped sectional", time: "10:42 AM", badge: "needs-approval",
    phone: "918-441-7823",
    draftContext: "Customer asking about L-shaped sectional pricing (6-7 seats). Price: $145–$175. Low-moisture citrus, dry in 1 hour, safe for kids and pets.",
    messages: [
      { id: "sw1", from: "customer", text: "Hi! How much would it cost to clean my L-shaped sectional? It's pretty large, maybe 6-7 seats." },
    ],
  },
  {
    id: "2", customer: "Tom Harrison", initials: "TH", channel: "whatsapp",
    preview: "Complaint — tech was 20 min late", time: "10:18 AM", badge: "escalated",
    phone: "918-552-0194",
    draftContext: "Customer upset that the technician arrived 20 minutes late with no apology. Respond with sincere apology and goodwill offer.",
    messages: [
      { id: "th1", from: "customer", text: "Your tech showed up 20 minutes late and didn't even apologize. Not a great experience." },
      { id: "th2", from: "agent", text: "Hi Tom, I sincerely apologize for the delay. That's not our standard." },
      { id: "th3", from: "customer", text: "Okay, I appreciate that. Just want to know it won't happen again." },
    ],
  },
  {
    id: "3", customer: "Lisa Monroe", initials: "LM", channel: "sms",
    preview: "Carpet + air ducts — 3-bed", time: "9:55 AM", badge: "pending",
    phone: "918-337-4401",
    draftContext: "Customer wants carpet cleaning and air duct cleaning for 3-bed home. Carpet 3BR: $195–$225. Air ducts: $199–$249.",
    messages: [
      { id: "lm1", from: "customer", text: "Hey! Looking to get my carpets and air ducts cleaned. 3 bedrooms. What's the price?" },
    ],
  },
  {
    id: "4", customer: "Oakwood Apartments", initials: "OA", channel: "email",
    preview: "Invoice #INV-4929 received", time: "Yesterday", badge: "answered",
    phone: "918-800-2200",
    draftContext: "Commercial client confirming receipt of invoice INV-4929 for unit 4B carpet cleaning.",
    messages: [
      { id: "oa1", from: "customer", text: "We received Invoice #INV-4929. Processing will take 5–7 business days. Thanks!" },
      { id: "oa2", from: "agent", text: "Thanks for confirming! Let us know if you need anything else." },
    ],
  },
  {
    id: "5", customer: "James Petrov", initials: "JP", channel: "facebook",
    preview: "Can you do same-day?", time: "Yesterday", badge: "sent",
    phone: "918-209-5513",
    draftContext: "Customer asking about same-day availability for sofa cleaning.",
    messages: [
      { id: "jp1", from: "customer", text: "Do you guys do same-day appointments? Need my sofa cleaned ASAP." },
      { id: "jp2", from: "agent", text: "Hi James! Yes, we often have same-day availability. I'll check and get right back to you." },
    ],
  },
];

const BADGE_CONFIG = {
  "needs-approval": { label: "Needs Approval", bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" },
  "escalated":      { label: "Escalated",      bg: "#fef2f2", text: "#b91c1c", border: "#fecaca" },
  "pending":        { label: "Pending",         bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  "answered":       { label: "Answered",        bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" },
  "sent":           { label: "Sent",            bg: "#f5f3ff", text: "#6d28d9", border: "#ddd6fe" },
};

function ChannelIcon({ ch }: { ch: Thread["channel"] }) {
  if (ch === "whatsapp") return <MessageCircle className="w-3.5 h-3.5" style={{ color: "#25d366" }} />;
  if (ch === "sms")      return <MessageCircle className="w-3.5 h-3.5" style={{ color: "#6b7a90" }} />;
  if (ch === "facebook") return <Facebook      className="w-3.5 h-3.5" style={{ color: "#1877f2" }} />;
  return                        <Mail          className="w-3.5 h-3.5" style={{ color: "#6b7a90" }} />;
}

export function InboxPage() {
  const profile = useProfile();
  const ryderName = profile.agents.customer_faq;
  const RYDER_SYSTEM = `You are ${ryderName}, the AI dispatcher for ${profile.business_name}. Draft warm, professional responses on behalf of ${profile.business_name}. Be concise — 2-4 sentences max. Use the customer context provided. Never make up prices or policies not in the context.`;
  const { toast } = useToast();

  const [waMessages,   setWaMessages]   = useState<WaMessage[]>([]);
  const [liveConnected, setLiveConnected] = useState<boolean | null>(null);
  const [isReceiving,  setIsReceiving]  = useState(false);
  const [lastInboundAt, setLastInboundAt] = useState<string | null>(null);

  const [activeId,      setActiveId]      = useState("");
  const [search,        setSearch]        = useState("");
  const [draft,         setDraft]         = useState("");
  const [loadingDraft,  setLoadingDraft]  = useState(false);
  const [sendDraft,     setSendDraft]     = useState<Record<string, string>>({});
  const [typed,         setTyped]         = useState("");
  const [sendLoading,   setSendLoading]   = useState(false);
  const [mobileView,    setMobileView]    = useState<"list" | "conversation">("list");
  const inputRef = useRef<HTMLInputElement>(null);

  /* ── Poll /api/dispatch/messages + /status every 10 s ───────── */
  const fetchMessages = useCallback(async () => {
    try {
      const [msgRes, statusRes] = await Promise.all([
        fetch("/api/dispatch/messages"),
        fetch("/api/dispatch/status"),
      ]);
      if (!msgRes.ok || !statusRes.ok) throw new Error("dispatch API error");
      const data = (await msgRes.json()) as WaMessage[];
      const status = (await statusRes.json()) as {
        isReceiving: boolean;
        lastInboundAt: string | null;
      };
      setWaMessages(data);
      setIsReceiving(status.isReceiving);
      setLastInboundAt(status.lastInboundAt);
      setLiveConnected(true);
    } catch {
      setLiveConnected(false);
      setIsReceiving(false);
    }
  }, []);

  useEffect(() => {
    void fetchMessages();
    const id = setInterval(() => void fetchMessages(), 10_000);
    return () => clearInterval(id);
  }, [fetchMessages]);

  /* ── Derive threads from real messages; fall back to mocks ───── */
  const realThreads = useMemo(() => buildThreads(waMessages), [waMessages]);
  const threads     = realThreads.length > 0 ? realThreads : MOCK_THREADS;
  const usingReal   = realThreads.length > 0;

  const filtered = threads.filter((t) =>
    t.customer.toLowerCase().includes(search.toLowerCase()) ||
    t.preview.toLowerCase().includes(search.toLowerCase())
  );

  const active = threads.find((t) => t.id === activeId) ?? threads[0];

  /* Keep a valid selection as threads change (real arrives / mocks clear). */
  useEffect(() => {
    if (!threads.some((t) => t.id === activeId) && threads.length > 0) {
      setActiveId(threads[0].id);
    }
  }, [threads, activeId]);

  function lastInboundLabel(): string {
    if (!lastInboundAt) return "no inbound yet";
    const mins = Math.floor((Date.now() - new Date(lastInboundAt).getTime()) / 60_000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  }

  /* ── KPI counters derived from real messages ─────────────────── */
  const newCount = waMessages.filter((m) => m.status === "new" && m.name !== "You").length;
  const KPIS = [
    { label: "Avg Response",     value: "0:43",                          sub: "min · On target",       accent: "#3db54a" },
    { label: "Messages Today",   value: String(waMessages.length || 47), sub: "across all channels",   accent: "#2b4fac" },
    { label: "Pending Approval", value: String(newCount || 3),           sub: "awaiting review",       accent: "#f97316" },
    { label: "Leads < 1 min",    value: "94%",                           sub: "response rate",         accent: "#eab308" },
  ];

  function selectThread(id: string) {
    setActiveId(id);
    setMobileView("conversation");
  }

  async function handleRyderDraft() {
    if (loadingDraft || !active) return;
    const lastCustomer = [...active.messages].reverse().find((m) => m.from === "customer")?.text
      ?? active.messages[active.messages.length - 1]?.text ?? "Hello";
    setLoadingDraft(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: RYDER_SYSTEM,
          messages: [
            { role: "user", content: `Context: ${active.draftContext}\n\nDraft a response to this customer message: "${lastCustomer}"` },
          ],
        }),
      });
      const data = await res.json();
      const text = data.content?.find((b: { type: string; text: string }) => b.type === "text")?.text ?? "";
      setSendDraft((prev) => ({ ...prev, [active.id]: text }));
    } catch {
      setSendDraft((prev) => ({ ...prev, [active.id]: "Error generating draft. Please try again." }));
    } finally {
      setLoadingDraft(false);
    }
  }

  /* ── Send via Twilio WhatsApp (real threads only) ────────────── */
  async function handleSend(text: string) {
    if (!text.trim() || sendLoading || !active) return;

    if (!usingReal) {
      /* Demo mode — never dispatch to illustrative numbers. */
      toast({
        title: "Demo data",
        description: "This is sample data. Replies send once a real WhatsApp message arrives.",
      });
      setTyped("");
      return;
    }
    if (!active.phone) {
      toast({ variant: "destructive", title: "No recipient number", description: "This thread has no sender phone number — cannot reply." });
      return;
    }

    setSendLoading(true);
    try {
      const res = await fetch("/api/dispatch/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: active.phone, message: text }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string; code?: number; help?: string };
      if (!res.ok) {
        const msg = data.error ?? "Send failed";
        const help = data.help ?? "";
        toast({
          variant: "destructive",
          title: data.code ? `WhatsApp send failed (Twilio ${data.code})` : "WhatsApp send failed",
          description: help ? `${msg} — ${help}` : msg,
        });
        return;
      }
      setTyped("");
      setSendDraft((prev) => ({ ...prev, [active.id]: "" }));
      void fetchMessages();
    } catch (err) {
      toast({ variant: "destructive", title: "WhatsApp send failed", description: err instanceof Error ? err.message : "Send failed" });
    } finally {
      setSendLoading(false);
    }
  }

  const activeDraft = active ? (sendDraft[active.id] ?? "") : "";

  return (
    /* explicit background so it follows content on mobile */
    <div className="flex flex-col gap-4" style={{ backgroundColor: "#f0f2f5", minHeight: "calc(100vh - 108px)" }}>

      {/* KPI row — 2 columns on mobile */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 flex-shrink-0">
        {KPIS.map((k) => (
          <div key={k.label} className="bg-white rounded-lg px-4 py-3.5"
            style={{ border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", borderTop: `2px solid ${k.accent}` }}>
            <p className="text-xs font-semibold uppercase mb-1" style={{ color: "#6b7a90", letterSpacing: "0.6px" }}>{k.label}</p>
            <p className="text-2xl font-bold tracking-tight mb-0.5" style={{ color: "#1a2333" }}>{k.value}</p>
            <p className="text-xs" style={{ color: "#6b7a90" }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Main area */}
      <div className="flex gap-4 flex-1 min-h-0">

        {/* Thread list — hide on mobile when conversation is shown */}
        <div
          className={`${mobileView === "conversation" ? "hidden md:flex" : "flex"} md:flex flex-col w-full md:w-[300px] flex-shrink-0 bg-white rounded-lg min-h-0`}
          style={{ border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
        >
          <div className="px-3 py-3 flex-shrink-0" style={{ borderBottom: "1px solid #f0f0f0" }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase" style={{ color: "#6b7a90", letterSpacing: "0.6px" }}>Inbox</p>
              {liveConnected !== null && (
                <span className="flex items-center gap-1 text-[10px] font-semibold"
                  title={!liveConnected ? "API unreachable" : isReceiving ? `Connected — last inbound ${lastInboundLabel()}` : `Idle — last inbound ${lastInboundLabel()}`}
                  data-testid="inbox-connection-status">
                  <span className={`w-2 h-2 rounded-full ${isReceiving ? "animate-pulse" : ""}`}
                    style={{ backgroundColor: !liveConnected ? "#ef4444" : isReceiving ? "#3db54a" : "#9ca3af" }} />
                  <span style={{ color: !liveConnected ? "#b91c1c" : isReceiving ? "#15803d" : "#6b7a90" }}>
                    {!liveConnected ? "Disconnected" : isReceiving ? "Connected" : "Idle"}
                  </span>
                  {liveConnected && (isReceiving
                    ? <Wifi className="w-3 h-3" style={{ color: "#3db54a" }} />
                    : <WifiOff className="w-3 h-3" style={{ color: "#9ca3af" }} />)}
                </span>
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "#6b7a90" }} />
              <input
                value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..." className="w-full pl-8 pr-3 py-2 text-xs rounded-md outline-none min-h-[44px]"
                style={{ border: "1px solid #e4e8f0", backgroundColor: "#f9fafb", color: "#1a2333" }}
              />
            </div>
          </div>

          {/* Demo banner when showing mock data */}
          {!usingReal && (
            <div className="px-4 py-2 text-[10px] text-center flex-shrink-0" style={{ backgroundColor: "#f8fafc", color: "#94a3b8", borderBottom: "1px solid #f0f4f8" }}>
              Demo data — real messages appear when WhatsApp connects
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {filtered.map((t) => {
              const bc       = BADGE_CONFIG[t.badge];
              const isActive = t.id === (active?.id ?? "");
              return (
                <button key={t.id} onClick={() => selectThread(t.id)}
                  className="w-full text-left px-3 py-3 flex gap-2.5 items-start transition-colors min-h-[64px]"
                  style={{ borderBottom: "1px solid #f5f5f5", backgroundColor: isActive ? "#eff6ff" : "transparent" }}
                  data-testid={`inbox-thread-${t.id}`}>
                  <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: isActive ? "#2b4fac" : "#94a3b8" }}>
                    {t.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="text-xs font-semibold truncate" style={{ color: "#1a2333" }}>{t.customer}</span>
                      <span className="text-[10px] flex-shrink-0" style={{ color: "#6b7a90" }}>{t.time}</span>
                    </div>
                    <div className="flex items-center gap-1 mb-1">
                      <ChannelIcon ch={t.channel} />
                      <p className="text-[11px] truncate" style={{ color: "#6b7a90" }}>{t.preview}</p>
                    </div>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                      style={{ backgroundColor: bc.bg, color: bc.text, border: `1px solid ${bc.border}` }}>
                      {bc.label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Conversation + Approval — full-screen on mobile */}
        <div
          className={`${mobileView === "list" ? "hidden md:flex" : "flex"} md:flex flex-col gap-3 flex-1 min-h-0 min-w-0`}
        >
          {/* Conversation card */}
          <div className="flex-1 bg-white rounded-lg flex flex-col min-h-0"
            style={{ border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>

            {/* Header — Back button on mobile */}
            <div className="px-4 md:px-5 py-3 flex items-center gap-3 flex-shrink-0" style={{ borderBottom: "1px solid #f0f0f0" }}>
              <button
                onClick={() => setMobileView("list")}
                className="md:hidden flex items-center justify-center w-8 h-8 rounded-md -ml-1 flex-shrink-0"
                style={{ color: "#2b4fac" }}
                data-testid="button-inbox-back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ backgroundColor: "#2b4fac" }}>{active?.initials}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold" style={{ color: "#1a2333" }}>{active?.customer}</p>
                  {active && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full hidden sm:inline"
                      style={{ backgroundColor: BADGE_CONFIG[active.badge].bg, color: BADGE_CONFIG[active.badge].text, border: `1px solid ${BADGE_CONFIG[active.badge].border}` }}>
                      {BADGE_CONFIG[active.badge].label}
                    </span>
                  )}
                </div>
                <p className="text-xs" style={{ color: "#6b7a90" }}>{active?.phone} · via {active?.channel}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 md:px-5 py-4 space-y-3">
              {active?.messages.map((m) => (
                <div key={m.id} className={`flex items-end gap-2 ${m.from === "agent" ? "flex-row-reverse" : ""}`}>
                  {m.from === "customer" && (
                    <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[10px] font-bold"
                      style={{ backgroundColor: "#94a3b8" }}>{active.initials[0]}</div>
                  )}
                  <div className="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm"
                    style={m.from === "agent"
                      ? { backgroundColor: "#2b4fac", color: "#fff", borderBottomRightRadius: "4px" }
                      : { backgroundColor: "#f0f2f5", color: "#1a2333", borderBottomLeftRadius: "4px" }}>
                    {m.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Type bar */}
            <form className="flex gap-2 px-4 py-3 flex-shrink-0" style={{ borderTop: "1px solid #f0f0f0" }}
              onSubmit={(e) => { e.preventDefault(); void handleSend(typed); }}>
              <input ref={inputRef} value={typed} onChange={(e) => setTyped(e.target.value)}
                placeholder="Type a message..." className="flex-1 text-sm px-4 py-2 rounded-full outline-none min-h-[44px]"
                style={{ border: "1px solid #e4e8f0", backgroundColor: "#f9fafb", color: "#1a2333" }} />
              <button type="submit" disabled={sendLoading} className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-50"
                style={{ backgroundColor: "#2b4fac" }} data-testid="button-inbox-send">
                <Send className="w-4 h-4 text-white" />
              </button>
            </form>
          </div>

          {/* Approval Zone */}
          <div className="bg-white rounded-lg flex-shrink-0"
            style={{ border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid #f5f5f5" }}>
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4" style={{ color: "#2b4fac" }} />
                <p className="text-sm font-bold" style={{ color: "#1a2333" }}>Approval Zone</p>
              </div>
              <button onClick={handleRyderDraft} disabled={loadingDraft}
                className="text-xs font-semibold px-3 py-2 rounded-md flex items-center gap-1.5 disabled:opacity-50 min-h-[36px]"
                style={{ backgroundColor: "#eff6ff", color: "#2b4fac", border: "1px solid #bfdbfe" }}
                data-testid="button-ryder-draft">
                {loadingDraft
                  ? <><span className="w-3 h-3 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />Drafting...</>
                  : <><Bot className="w-3 h-3" />{ryderName} Draft</>}
              </button>
            </div>
            <div className="px-5 py-3">
              {activeDraft ? (
                <>
                  <p className="text-sm mb-3 leading-relaxed" style={{ color: "#374151" }}>{activeDraft}</p>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => void handleSend(activeDraft)} disabled={sendLoading}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-md min-h-[36px] disabled:opacity-50"
                      style={{ backgroundColor: "#3db54a", color: "#fff" }} data-testid="button-send-approve">
                      <Send className="w-3 h-3" />{sendLoading ? "Sending..." : "Send"}
                    </button>
                    <button onClick={() => { setTyped(activeDraft); requestAnimationFrame(() => inputRef.current?.focus()); }}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-md min-h-[36px]"
                      style={{ backgroundColor: "#f0f2f5", color: "#1a2333", border: "1px solid #e4e8f0" }} data-testid="button-edit-draft">
                      <Edit className="w-3 h-3" />Edit
                    </button>
                    <button onClick={() => requestAnimationFrame(() => inputRef.current?.focus())}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-md min-h-[36px]"
                      style={{ backgroundColor: "#fff7ed", color: "#c2410c", border: "1px solid #fed7aa" }} data-testid="button-take-over">
                      <UserCheck className="w-3 h-3" />Take Over
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-xs" style={{ color: "#6b7a90" }}>
                  Click "{ryderName} Draft" to generate an AI-powered response for this conversation.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
