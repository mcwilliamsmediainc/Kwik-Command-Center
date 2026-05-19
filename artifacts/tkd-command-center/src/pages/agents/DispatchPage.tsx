import { useState } from "react";
import {
  MessageCircle,
  Mail,
  Facebook,
  Send,
  Edit,
  UserCheck,
  Zap,
  MessageSquare,
  ChevronRight,
  Bot,
} from "lucide-react";

/* ─── Types ──────────────────────────────────────────────────── */
interface ChatMessage {
  id: string;
  from: "system" | "customer" | "agent";
  text: string;
}

interface Thread {
  id: string;
  customer: string;
  channel: "whatsapp" | "sms" | "facebook" | "email";
  preview: string;
  time: string;
  badge: "needs-approval" | "escalated" | "sent" | "answered" | "pending";
  jobs: number;
  ltv: string;
  lastService: string;
  phone: string;
  draftContext: string;
  messages: ChatMessage[];
}

/* ─── Static data ─────────────────────────────────────────────── */
const THREADS: Thread[] = [
  {
    id: "1",
    customer: "Sandra Williams",
    channel: "whatsapp",
    preview: "Pricing — L-shaped sectional",
    time: "10:42 AM",
    badge: "needs-approval",
    jobs: 4,
    ltv: "$847",
    lastService: "March 15",
    phone: "918-441-7823",
    draftContext:
      "Customer asking about L-shaped sectional pricing (6-7 seats). L-shaped sectional: $145–$175. Low-moisture citrus, dry in 1 hour, safe for kids and pets.",
    messages: [
      {
        id: "s1",
        from: "system",
        text: "CUSTOMER: Sandra Williams · Pricing — L-shaped sectional (large) · 918-441-7823 · Not urgent",
      },
      {
        id: "s2",
        from: "customer",
        text: "Hi! How much would it cost to clean my L-shaped sectional? It's pretty large, maybe 6-7 seats.",
      },
    ],
  },
  {
    id: "2",
    customer: "Tom Harrison",
    channel: "whatsapp",
    preview: "Complaint — tech was 20 min late",
    time: "10:18 AM",
    badge: "escalated",
    jobs: 2,
    ltv: "$312",
    lastService: "April 2",
    phone: "918-552-0194",
    draftContext:
      "Customer is upset that the technician arrived 20 minutes late with no apology. Respond with a sincere apology and offer goodwill — perhaps a discount or priority scheduling.",
    messages: [
      {
        id: "t1",
        from: "system",
        text: "CUSTOMER: Tom Harrison · Complaint — technician 20 min late · 918-552-0194 · Urgent",
      },
      {
        id: "t2",
        from: "customer",
        text: "Your tech showed up 20 minutes late and didn't even apologize. Not happy about this.",
      },
    ],
  },
  {
    id: "3",
    customer: "Lisa Martinez",
    channel: "sms",
    preview: "Booking confirmed — wants Peyton",
    time: "9:55 AM",
    badge: "sent",
    jobs: 7,
    ltv: "$1,430",
    lastService: "May 1",
    phone: "918-770-3382",
    draftContext: "Booking confirmed. Customer requested Peyton as their technician again.",
    messages: [
      {
        id: "l1",
        from: "system",
        text: "CUSTOMER: Lisa Martinez · Booking confirmation · 918-770-3382 · Not urgent",
      },
      {
        id: "l2",
        from: "customer",
        text: "Can I get Peyton again? He did such a great job last time!",
      },
      {
        id: "l3",
        from: "agent",
        text: "Of course, Lisa! I've noted Peyton as your preferred tech. We'll do our best to schedule him for your appointment. See you soon!",
      },
    ],
  },
  {
    id: "4",
    customer: "Jennifer Hayes",
    channel: "facebook",
    preview: "Asked about tile cleaning",
    time: "9:20 AM",
    badge: "answered",
    jobs: 1,
    ltv: "$188",
    lastService: "February 10",
    phone: "918-334-9021",
    draftContext:
      "Customer asked about tile and grout cleaning. Price: $99 for first 2 areas, $0.50/sq ft additional.",
    messages: [
      {
        id: "j1",
        from: "system",
        text: "CUSTOMER: Jennifer Hayes · Tile & grout inquiry · 918-334-9021 · Not urgent",
      },
      {
        id: "j2",
        from: "customer",
        text: "What do you charge for tile and grout cleaning? My kitchen and both bathrooms need it bad.",
      },
      {
        id: "j3",
        from: "agent",
        text: "Hi Jennifer! Tile & grout starts at $99 for the first 2 areas, then $0.50/sq ft after that. Kitchen + 2 baths would be a great bundle — want a custom quote?",
      },
    ],
  },
  {
    id: "5",
    customer: "David Park",
    channel: "email",
    preview: "Quote follow-up — air duct bundle",
    time: "Yesterday",
    badge: "pending",
    jobs: 3,
    ltv: "$624",
    lastService: "January 28",
    phone: "918-209-5517",
    draftContext:
      "Customer following up on air duct cleaning quote. Air ducts: $199 up to 10 vents, $30 each additional. Dryer vent side wall: $99.",
    messages: [
      {
        id: "d1",
        from: "system",
        text: "CUSTOMER: David Park · Quote follow-up — air duct bundle · 918-209-5517 · Not urgent",
      },
      {
        id: "d2",
        from: "customer",
        text: "Hey, I got a quote last week for air duct cleaning. Can you remind me the bundle pricing? Thinking of adding the dryer vent too.",
      },
    ],
  },
];

const BADGE: Record<Thread["badge"], { label: string; bg: string; color: string }> = {
  "needs-approval": { label: "Needs Approval", bg: "#fef9c3", color: "#a16207" },
  escalated:        { label: "Escalated",       bg: "#ffedd5", color: "#c2410c" },
  sent:             { label: "Sent",             bg: "#dcfce7", color: "#15803d" },
  answered:         { label: "Answered",         bg: "#dbeafe", color: "#1d4ed8" },
  pending:          { label: "Pending",          bg: "#f3f4f6", color: "#4b5563" },
};

type ChannelKey = Thread["channel"];
const CHANNEL: Record<ChannelKey, { Icon: typeof MessageCircle; color: string }> = {
  whatsapp: { Icon: MessageCircle, color: "#25d366" },
  sms:      { Icon: MessageSquare, color: "#6366f1" },
  facebook: { Icon: Facebook,      color: "#1877f2" },
  email:    { Icon: Mail,          color: "#6b7a90"  },
};

const KPIS = [
  { label: "Avg First Response", value: "0:43",  sub: "vs 6+ hr industry avg",    color: "#2b4fac" },
  { label: "Messages Today",     value: "47",    sub: "38 auto-handled by Ryder", color: "#3db54a" },
  { label: "Pending Approval",   value: "3",     sub: "needs your review",        color: "#f97316" },
  { label: "Leads < 1 min",      value: "94%",   sub: "+38% conversion lift",     color: "#7c3aed" },
];

const DEFAULT_DRAFT =
  "Hi Sandra! For an L-shaped sectional that size, you're looking at $145–$175 depending on the exact seat count. Includes cleaning, deodorizing, disinfecting & protecting — all-natural citrus, safe for kids and pets. Dry in about an hour. Want me to check availability? 📅";

/* ─── Component ──────────────────────────────────────────────── */
export function DispatchPage() {
  const [activeId, setActiveId]           = useState("1");
  const [draft, setDraft]                 = useState(DEFAULT_DRAFT);
  const [draftLoading, setDraftLoading]   = useState(false);
  const [inputText, setInputText]         = useState("");

  const active      = THREADS.find((t) => t.id === activeId)!;
  const showApproval =
    active.badge === "needs-approval" || active.badge === "pending" || active.badge === "escalated";

  async function generateDraft() {
    setDraftLoading(true);
    setDraft("");
    try {
      const lastCustomerMsg =
        [...active.messages].reverse().find((m) => m.from === "customer")?.text ?? "Hello";

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: `You are Ryder, the AI assistant for Tulsa Kwik Dry. Write a short, warm, professional reply draft for the following customer situation. Keep it under 3 sentences. End with a gentle call to action. Context: ${active.draftContext}`,
          messages: [{ role: "user", content: lastCustomerMsg }],
        }),
      });

      const data = (await res.json()) as {
        content?: Array<{ type: string; text: string }>;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "API error");
      setDraft(data.content?.find((b) => b.type === "text")?.text ?? "");
    } catch (err) {
      setDraft(`Error: ${err instanceof Error ? err.message : "Something went wrong"}`);
    } finally {
      setDraftLoading(false);
    }
  }

  function handleThreadClick(id: string) {
    setActiveId(id);
    setDraft(id === "1" ? DEFAULT_DRAFT : "");
  }

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-108px)]">

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 flex-shrink-0">
        {KPIS.map((k) => (
          <div
            key={k.label}
            className="bg-white rounded-lg px-3 py-3 md:px-4 md:py-3.5"
            style={{
              border: "1px solid rgba(0,0,0,0.07)",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              borderTop: `2px solid ${k.color}`,
            }}
          >
            <p
              className="text-[9px] md:text-xs font-medium uppercase mb-1"
              style={{ color: "#6b7a90", letterSpacing: "0.6px" }}
            >
              {k.label}
            </p>
            <p className="text-2xl font-bold tracking-tight mb-0.5" style={{ color: "#1a2333" }}>
              {k.value}
            </p>
            <p className="text-[10px] md:text-xs" style={{ color: "#6b7a90" }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Two columns ── */}
      <div className="flex flex-col md:flex-row gap-4 flex-1 min-h-0">

        {/* Left: thread list + template */}
        <div className="w-full md:w-[300px] flex-shrink-0 flex flex-col gap-3 min-h-0">

          {/* Thread list */}
          <div
            className="flex-1 bg-white rounded-lg overflow-y-auto min-h-0"
            style={{ border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
          >
            <div
              className="px-4 py-3 flex items-center justify-between flex-shrink-0"
              style={{ borderBottom: "1px solid #f0f0f0" }}
            >
              <p
                className="text-xs font-semibold uppercase"
                style={{ color: "#6b7a90", letterSpacing: "0.6px" }}
              >
                Conversations
              </p>
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white"
                style={{ backgroundColor: "#f97316" }}
              >
                3
              </span>
            </div>

            {THREADS.map((thread) => {
              const isActive      = thread.id === activeId;
              const { Icon, color } = CHANNEL[thread.channel];
              const badge          = BADGE[thread.badge];
              const initials       = thread.customer.split(" ").map((n) => n[0]).join("");

              return (
                <button
                  key={thread.id}
                  onClick={() => handleThreadClick(thread.id)}
                  className="w-full text-left px-4 py-3 transition-colors"
                  style={{
                    backgroundColor: isActive ? "#eff4ff" : "transparent",
                    borderBottom: "1px solid #f5f5f5",
                  }}
                  data-testid={`thread-${thread.id}`}
                >
                  <div className="flex items-start gap-2.5">
                    {/* Avatar */}
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold mt-0.5"
                      style={{ backgroundColor: "#1e2a3a" }}
                    >
                      {initials}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-semibold truncate" style={{ color: "#1a2333" }}>
                          {thread.customer}
                        </span>
                        <span className="text-[10px] flex-shrink-0 ml-1" style={{ color: "#6b7a90" }}>
                          {thread.time}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mb-1.5">
                        <Icon className="w-3 h-3 flex-shrink-0" style={{ color }} />
                        <span className="text-[11px] truncate" style={{ color: "#6b7a90" }}>
                          {thread.preview}
                        </span>
                      </div>
                      <span
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                        style={{ backgroundColor: badge.bg, color: badge.color }}
                      >
                        {badge.label}
                      </span>
                    </div>

                    {isActive && (
                      <ChevronRight
                        className="w-3.5 h-3.5 flex-shrink-0 mt-2"
                        style={{ color: "#2b4fac" }}
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Template card */}
          <div
            className="bg-white rounded-lg flex-shrink-0"
            style={{ border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
          >
            <div className="px-4 py-3" style={{ borderBottom: "1px solid #f0f0f0" }}>
              <p
                className="text-xs font-semibold uppercase"
                style={{ color: "#6b7a90", letterSpacing: "0.6px" }}
              >
                Call Center Message Format
              </p>
            </div>
            <pre
              className="px-4 py-3 text-[11px] leading-relaxed font-mono whitespace-pre"
              style={{ color: "#4b5563" }}
            >
{`CUSTOMER: [Name]
ISSUE: [Category — detail]
PHONE: [Number]
URGENT: [Yes / No]
TECH: [Isiah / Peyton / Anthony / Evan]`}
            </pre>
          </div>
        </div>

        {/* Right: active conversation */}
        <div
          className="flex-1 bg-white rounded-lg flex flex-col min-h-0 min-w-0"
          style={{ border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
        >
          {/* Conversation header */}
          <div
            className="px-5 py-3.5 flex items-center gap-3 flex-shrink-0"
            style={{ borderBottom: "1px solid #f0f0f0" }}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-bold" style={{ color: "#1a2333" }}>
                  {active.customer}
                </span>
                <span
                  className="text-xs font-medium capitalize px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: "#f0f2f5", color: "#6b7a90" }}
                >
                  {active.channel}
                </span>
              </div>
              <span className="text-xs" style={{ color: "#6b7a90" }}>
                {active.jobs} jobs · LTV {active.ltv} · Last service {active.lastService} · {active.phone}
              </span>
            </div>
            <span
              className="text-[11px] font-semibold px-2 py-1 rounded-full flex-shrink-0"
              style={{ backgroundColor: BADGE[active.badge].bg, color: BADGE[active.badge].color }}
            >
              {BADGE[active.badge].label}
            </span>
          </div>

          {/* Message bubbles — Fix 1: bounded height on mobile, full on desktop */}
          <div className="overflow-y-auto px-5 py-4 space-y-3 max-h-[40vh] pb-[120px] md:pb-4 md:flex-1 md:max-h-none min-h-0">
            {active.messages.map((msg) => {
              if (msg.from === "system") {
                return (
                  <div key={msg.id} className="flex justify-center">
                    <div
                      className="text-[11px] px-3 py-2 rounded-lg max-w-[85%] text-center font-mono leading-relaxed"
                      style={{
                        backgroundColor: "#f8fafc",
                        color: "#64748b",
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              }
              if (msg.from === "customer") {
                return (
                  <div key={msg.id} className="flex justify-end">
                    <div
                      className="max-w-[70%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed"
                      style={{
                        backgroundColor: "#2b4fac",
                        color: "#fff",
                        borderBottomRightRadius: "4px",
                      }}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              }
              return (
                <div key={msg.id} className="flex justify-start">
                  <div
                    className="max-w-[70%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed"
                    style={{
                      backgroundColor: "#f5f7ff",
                      color: "#1a2333",
                      borderBottomLeftRadius: "4px",
                    }}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Approval zone ── */}
          {showApproval && (
            <div
              className="px-5 py-4 flex-shrink-0"
              style={{ borderTop: "1px solid #fde68a", backgroundColor: "#fffbeb" }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Bot className="w-3.5 h-3.5" style={{ color: "#d97706" }} />
                <span className="text-xs font-semibold" style={{ color: "#92400e" }}>
                  Ryder Draft — Pending Approval
                </span>
              </div>

              {draftLoading ? (
                <div className="flex gap-1.5 items-center py-1 mb-3">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full animate-bounce"
                      style={{ backgroundColor: "#d97706", animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm leading-relaxed mb-3" style={{ color: "#1a2333" }}>
                  {draft || "Click \"Ryder Draft\" below to generate a reply."}
                </p>
              )}

              <div className="flex gap-2">
                <button
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                  style={{ backgroundColor: "#3db54a" }}
                  data-testid="button-send-draft"
                >
                  <Send className="w-3.5 h-3.5" /> Send
                </button>
                <button
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ backgroundColor: "#f0f2f5", color: "#4b5563" }}
                  data-testid="button-edit-draft"
                >
                  <Edit className="w-3.5 h-3.5" /> Edit
                </button>
                <button
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ backgroundColor: "#f0f2f5", color: "#4b5563" }}
                  data-testid="button-take-over"
                >
                  <UserCheck className="w-3.5 h-3.5" /> Take Over
                </button>
              </div>
            </div>
          )}

          {/* ── Input bar ── */}
          <div
            className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
            style={{ borderTop: "1px solid #f0f0f0" }}
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 text-sm px-4 py-2.5 rounded-full outline-none"
              style={{ border: "1px solid #e4e8f0", backgroundColor: "#f9fafb", color: "#1a2333" }}
              data-testid="input-dispatch-message"
            />
            <button
              onClick={generateDraft}
              disabled={draftLoading}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-full transition-opacity disabled:opacity-50 flex-shrink-0"
              style={{ backgroundColor: "#fffbeb", color: "#d97706", border: "1px solid #fde68a" }}
              data-testid="button-ryder-draft"
            >
              <Zap className="w-3.5 h-3.5" />
              {draftLoading ? "Drafting…" : "Ryder Draft"}
            </button>
            <button
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: "#2b4fac" }}
              data-testid="button-send-message"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
