import { useState } from "react";
import {
  MessageCircle, Mail, Facebook, Send, Edit, UserCheck, Bot, Search, Clock, CheckCircle, AlertCircle,
} from "lucide-react";

/* ─── Types ──────────────────────────────────────────────────── */
interface Msg { from: "customer" | "agent"; text: string }
interface Thread {
  id: string; customer: string; initials: string;
  channel: "whatsapp" | "sms" | "facebook" | "email";
  preview: string; time: string;
  badge: "needs-approval" | "escalated" | "sent" | "answered" | "pending";
  phone: string; draftContext: string; messages: Msg[];
}

/* ─── Data ────────────────────────────────────────────────────── */
const THREADS: Thread[] = [
  {
    id: "1", customer: "Sandra Williams", initials: "SW", channel: "whatsapp",
    preview: "Pricing — L-shaped sectional", time: "10:42 AM", badge: "needs-approval",
    phone: "918-441-7823",
    draftContext: "Customer asking about L-shaped sectional pricing (6-7 seats). Price: $145–$175. Low-moisture citrus, dry in 1 hour, safe for kids and pets.",
    messages: [
      { from: "customer", text: "Hi! How much would it cost to clean my L-shaped sectional? It's pretty large, maybe 6-7 seats." },
    ],
  },
  {
    id: "2", customer: "Tom Harrison", initials: "TH", channel: "whatsapp",
    preview: "Complaint — tech was 20 min late", time: "10:18 AM", badge: "escalated",
    phone: "918-552-0194",
    draftContext: "Customer upset that the technician arrived 20 minutes late with no apology. Respond with sincere apology and goodwill offer.",
    messages: [
      { from: "customer", text: "Your tech showed up 20 minutes late and didn't even apologize. Not a great experience." },
      { from: "agent", text: "Hi Tom, I sincerely apologize for the delay. That's not the Kwik Dry standard." },
      { from: "customer", text: "Okay, I appreciate that. Just want to know it won't happen again." },
    ],
  },
  {
    id: "3", customer: "Lisa Monroe", initials: "LM", channel: "sms",
    preview: "Carpet + air ducts — 3-bed", time: "9:55 AM", badge: "pending",
    phone: "918-337-4401",
    draftContext: "Customer wants carpet cleaning and air duct cleaning for 3-bed home. Carpet 3BR: $195–$225. Air ducts: $199–$249.",
    messages: [
      { from: "customer", text: "Hey! Looking to get my carpets and air ducts cleaned. 3 bedrooms. What's the price?" },
    ],
  },
  {
    id: "4", customer: "Oakwood Apartments", initials: "OA", channel: "email",
    preview: "Invoice #INV-4929 received", time: "Yesterday", badge: "answered",
    phone: "918-800-2200",
    draftContext: "Commercial client confirming receipt of invoice INV-4929 for unit 4B carpet cleaning.",
    messages: [
      { from: "customer", text: "We received Invoice #INV-4929. Processing will take 5–7 business days. Thanks!" },
      { from: "agent", text: "Thanks for confirming! Let us know if you need anything else." },
    ],
  },
  {
    id: "5", customer: "James Petrov", initials: "JP", channel: "facebook",
    preview: "Can you do same-day?", time: "Yesterday", badge: "sent",
    phone: "918-209-5513",
    draftContext: "Customer asking about same-day availability for sofa cleaning.",
    messages: [
      { from: "customer", text: "Do you guys do same-day appointments? Need my sofa cleaned ASAP." },
      { from: "agent", text: "Hi James! Yes, we often have same-day availability. I'll check and get right back to you." },
    ],
  },
];

const KPIS = [
  { label: "Avg Response", value: "0:43", sub: "min · On target", accent: "#3db54a" },
  { label: "Messages Today", value: "47", sub: "across all channels", accent: "#2b4fac" },
  { label: "Pending Approval", value: "3", sub: "awaiting review", accent: "#f97316" },
  { label: "Leads < 1 min", value: "94%", sub: "response rate", accent: "#eab308" },
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

const RYDER_SYSTEM = `You are Ryder, the AI dispatcher for Tulsa Kwik Dry. Draft warm, professional responses on behalf of Tulsa Kwik Dry. Be concise — 2-4 sentences max. Use the customer context provided. Never make up prices or policies not in the context.`;

export function InboxPage() {
  const [activeId, setActiveId] = useState("1");
  const [search, setSearch]     = useState("");
  const [draft, setDraft]       = useState("");
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [sendDraft, setSendDraft]       = useState<Record<string, string>>({});

  const active = THREADS.find((t) => t.id === activeId)!;
  const filtered = THREADS.filter((t) =>
    t.customer.toLowerCase().includes(search.toLowerCase()) ||
    t.preview.toLowerCase().includes(search.toLowerCase())
  );

  async function handleRyderDraft() {
    if (loadingDraft) return;
    setLoadingDraft(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: RYDER_SYSTEM,
          messages: [
            { role: "user", content: `Context: ${active.draftContext}\n\nDraft a response to this customer message: "${active.messages[active.messages.length - 1].text}"` },
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

  const activeDraft = sendDraft[active.id] ?? "";

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-108px)]">
      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4 flex-shrink-0">
        {KPIS.map((k) => (
          <div key={k.label} className="bg-white rounded-lg px-4 py-3.5"
            style={{ border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", borderTop: `2px solid ${k.accent}` }}>
            <p className="text-xs font-semibold uppercase mb-1" style={{ color: "#6b7a90", letterSpacing: "0.6px" }}>{k.label}</p>
            <p className="text-2xl font-bold tracking-tight mb-0.5" style={{ color: "#1a2333" }}>{k.value}</p>
            <p className="text-xs" style={{ color: "#6b7a90" }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Main two-column */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Thread list */}
        <div className="w-[300px] flex-shrink-0 bg-white rounded-lg flex flex-col min-h-0"
          style={{ border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div className="px-3 py-3 flex-shrink-0" style={{ borderBottom: "1px solid #f0f0f0" }}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "#6b7a90" }} />
              <input
                value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..." className="w-full pl-8 pr-3 py-2 text-xs rounded-md outline-none"
                style={{ border: "1px solid #e4e8f0", backgroundColor: "#f9fafb", color: "#1a2333" }}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.map((t) => {
              const bc = BADGE_CONFIG[t.badge];
              const isActive = t.id === activeId;
              return (
                <button key={t.id} onClick={() => setActiveId(t.id)}
                  className="w-full text-left px-3 py-3 flex gap-2.5 items-start transition-colors"
                  style={{ borderBottom: "1px solid #f5f5f5", backgroundColor: isActive ? "#eff6ff" : "transparent" }}>
                  <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
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

        {/* Conversation + approval */}
        <div className="flex-1 flex flex-col gap-3 min-h-0 min-w-0">
          {/* Conversation */}
          <div className="flex-1 bg-white rounded-lg flex flex-col min-h-0"
            style={{ border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            {/* Header */}
            <div className="px-5 py-3 flex items-center gap-3 flex-shrink-0" style={{ borderBottom: "1px solid #f0f0f0" }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ backgroundColor: "#2b4fac" }}>{active.initials}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold" style={{ color: "#1a2333" }}>{active.customer}</p>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: BADGE_CONFIG[active.badge].bg, color: BADGE_CONFIG[active.badge].text, border: `1px solid ${BADGE_CONFIG[active.badge].border}` }}>
                    {BADGE_CONFIG[active.badge].label}
                  </span>
                </div>
                <p className="text-xs" style={{ color: "#6b7a90" }}>{active.phone} · via {active.channel}</p>
              </div>
            </div>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {active.messages.map((m, i) => (
                <div key={i} className={`flex items-end gap-2 ${m.from === "agent" ? "flex-row-reverse" : ""}`}>
                  {m.from === "customer" && (
                    <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[10px] font-bold"
                      style={{ backgroundColor: "#94a3b8" }}>{active.initials[0]}</div>
                  )}
                  <div className="max-w-[70%] rounded-2xl px-4 py-2.5 text-sm"
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
              onSubmit={(e) => e.preventDefault()}>
              <input value={draft} onChange={(e) => setDraft(e.target.value)}
                placeholder="Type a message..." className="flex-1 text-sm px-4 py-2 rounded-full outline-none"
                style={{ border: "1px solid #e4e8f0", backgroundColor: "#f9fafb", color: "#1a2333" }} />
              <button type="submit" className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
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
                className="text-xs font-semibold px-3 py-1.5 rounded-md flex items-center gap-1.5 disabled:opacity-50"
                style={{ backgroundColor: "#eff6ff", color: "#2b4fac", border: "1px solid #bfdbfe" }}
                data-testid="button-ryder-draft">
                {loadingDraft
                  ? <><span className="w-3 h-3 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />Drafting...</>
                  : <><Bot className="w-3 h-3" />Ryder Draft</>}
              </button>
            </div>
            <div className="px-5 py-3">
              {activeDraft ? (
                <>
                  <p className="text-sm mb-3 leading-relaxed" style={{ color: "#374151" }}>{activeDraft}</p>
                  <div className="flex gap-2">
                    <button className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md"
                      style={{ backgroundColor: "#3db54a", color: "#fff" }} data-testid="button-send-approve">
                      <Send className="w-3 h-3" />Send
                    </button>
                    <button className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md"
                      style={{ backgroundColor: "#f0f2f5", color: "#1a2333", border: "1px solid #e4e8f0" }} data-testid="button-edit-draft">
                      <Edit className="w-3 h-3" />Edit
                    </button>
                    <button className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md"
                      style={{ backgroundColor: "#fff7ed", color: "#c2410c", border: "1px solid #fed7aa" }} data-testid="button-take-over">
                      <UserCheck className="w-3 h-3" />Take Over
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-xs" style={{ color: "#6b7a90" }}>
                  Click "Ryder Draft" to generate an AI-powered response for this conversation.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
