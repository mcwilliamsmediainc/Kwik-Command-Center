import { useState, useRef, useEffect } from "react";
import { Send, Bot, DollarSign, Users, FileText, Zap } from "lucide-react";

/* ─── Data ────────────────────────────────────────────────────── */
const KPIS = [
  { label: "Est. Recoverable", value: "$4,340", sub: "from dormant customers", accent: "#3db54a" },
  { label: "Dormant Customers", value: "31",     sub: "inactive 12mo+",         accent: "#f97316" },
  { label: "Open Quotes",      value: "6",      sub: "awaiting response",       accent: "#2b4fac" },
  { label: "Active Sequences", value: "3",      sub: "campaigns running",       accent: "#8b5cf6" },
];
const KPI_ICONS = [DollarSign, Users, FileText, Zap];

const OPEN_QUOTES = [
  { name: "James Petrov",  service: "Sofa Cleaning",     value: "$145", date: "May 14", age: "4 days" },
  { name: "Rachel Moore",  service: "Carpet 3BR",        value: "$225", date: "May 12", age: "6 days" },
  { name: "Pine Plaza",    service: "Commercial Carpet",  value: "$480", date: "May 10", age: "8 days" },
];

const WIN_BACK = [
  { name: "Tom Harrison",  lastService: "Carpet Cleaning", dormant: "4 months",  ltv: "$312",  phone: "918-552-0194" },
  { name: "Lisa Monroe",   lastService: "Air Duct",        dormant: "6 months",  ltv: "$195",  phone: "918-337-4401" },
  { name: "Michael Chen",  lastService: "Upholstery",      dormant: "3 years",   ltv: "$520",  phone: "918-555-2241" },
  { name: "Elena Rodriguez", lastService: "Tile & Grout",  dormant: "28 months", ltv: "$450",  phone: "918-555-7742" },
];

const REACT_SYSTEM = `You are Ryder, the AI dispatcher for Tulsa Kwik Dry. Draft personalized win-back or quote follow-up messages on behalf of Tulsa Kwik Dry. Be warm, brief, and personal. Reference the specific service or customer history provided. 2-3 sentences max. Do not use generic templates.`;

interface Msg { role: "user" | "assistant"; content: string }
const WELCOME: Msg = {
  role: "assistant",
  content: "I can draft personalized win-back messages or quote follow-ups for you. Just tell me who you'd like to reach out to and I'll write something specific and warm.",
};

/* ─── Component ──────────────────────────────────────────────── */
export function ReactivationPage() {
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const bottomRef               = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  async function send(text: string) {
    if (!text.trim() || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: text.trim() }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system: REACT_SYSTEM, messages: next.map((m) => ({ role: m.role, content: m.content })) }),
      });
      const data = await res.json();
      const reply = data.content?.find((b: { type: string; text: string }) => b.type === "text")?.text ?? "Error generating message.";
      setMessages([...next, { role: "assistant", content: reply }]);
    } catch {
      setMessages([...next, { role: "assistant", content: "Error generating message. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {KPIS.map((k, i) => {
          const Icon = KPI_ICONS[i];
          return (
            <div key={k.label} className="bg-white rounded-lg px-4 py-3.5"
              style={{ border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", borderTop: `2px solid ${k.accent}` }}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase mb-1" style={{ color: "#6b7a90", letterSpacing: "0.6px" }}>{k.label}</p>
                  <p className="text-2xl font-bold tracking-tight mb-0.5" style={{ color: "#1a2333" }}>{k.value}</p>
                  <p className="text-xs" style={{ color: "#6b7a90" }}>{k.sub}</p>
                </div>
                <div className="p-2 rounded-lg" style={{ backgroundColor: `${k.accent}14` }}>
                  <Icon className="w-4 h-4" style={{ color: k.accent }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Two-column + AI chat */}
      <div className="grid grid-cols-2 gap-4">
        {/* Open Quotes */}
        <div className="bg-white rounded-lg overflow-hidden"
          style={{ border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div className="px-5 py-3.5" style={{ borderBottom: "1px solid #f0f0f0" }}>
            <p className="text-sm font-bold" style={{ color: "#1a2333" }}>Open Quotes</p>
          </div>
          <div className="divide-y divide-gray-50">
            {OPEN_QUOTES.map((q) => (
              <div key={q.name} className="px-5 py-3.5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: "#2b4fac" }}>{q.name[0]}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: "#1a2333" }}>{q.name}</p>
                  <p className="text-xs" style={{ color: "#6b7a90" }}>{q.service} · Sent {q.date} · {q.age} old</p>
                </div>
                <span className="text-sm font-bold flex-shrink-0" style={{ color: "#3db54a" }}>{q.value}</span>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button onClick={() => send(`Draft a follow-up message for ${q.name} who received a quote for ${q.service} (${q.value}) ${q.age} ago with no response.`)}
                    className="text-xs font-semibold px-2.5 py-1 rounded-md"
                    style={{ backgroundColor: "#eff6ff", color: "#2b4fac", border: "1px solid #bfdbfe" }}
                    data-testid={`button-draft-quote-${q.name.toLowerCase().replace(/\s+/g, "-")}`}>
                    Draft
                  </button>
                  <button className="text-xs font-semibold px-2.5 py-1 rounded-md"
                    style={{ backgroundColor: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca" }}>
                    Mark Lost
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Win-Back Queue */}
        <div className="bg-white rounded-lg overflow-hidden"
          style={{ border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div className="px-5 py-3.5" style={{ borderBottom: "1px solid #f0f0f0" }}>
            <p className="text-sm font-bold" style={{ color: "#1a2333" }}>Win-Back Queue</p>
          </div>
          <div className="divide-y divide-gray-50">
            {WIN_BACK.map((c) => (
              <div key={c.name} className="px-5 py-3.5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: "#f97316" }}>{c.name[0]}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: "#1a2333" }}>{c.name}</p>
                  <p className="text-xs" style={{ color: "#6b7a90" }}>Last: {c.lastService} · Dormant {c.dormant}</p>
                </div>
                <span className="text-xs font-semibold flex-shrink-0" style={{ color: "#6b7a90" }}>{c.ltv} LTV</span>
                <button onClick={() => send(`Draft a warm win-back message for ${c.name} who last used Tulsa Kwik Dry for ${c.lastService} and has been dormant for ${c.dormant}. LTV: ${c.ltv}.`)}
                  className="text-xs font-semibold px-2.5 py-1 rounded-md flex-shrink-0"
                  style={{ backgroundColor: "#fff7ed", color: "#c2410c", border: "1px solid #fed7aa" }}
                  data-testid={`button-draft-winback-${c.name.toLowerCase().replace(/\s+/g, "-")}`}>
                  Draft
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Chat */}
      <div className="bg-white rounded-lg overflow-hidden"
        style={{ border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div className="px-5 py-3 flex items-center gap-3" style={{ borderBottom: "1px solid #f0f0f0" }}>
          <Bot className="w-4 h-4" style={{ color: "#8b5cf6" }} />
          <p className="text-sm font-bold" style={{ color: "#1a2333" }}>Ryder — Message Drafter</p>
        </div>
        <div className="h-44 overflow-y-auto px-5 py-3 space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex items-start gap-2.5 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[10px] font-bold"
                style={{ background: m.role === "assistant" ? "linear-gradient(135deg, #8b5cf6, #6d28d9)" : "#e9eef8" }}>
                {m.role === "assistant" ? "R" : <span style={{ color: "#6b7a90" }}>U</span>}
              </div>
              <div className="max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed"
                style={m.role === "assistant"
                  ? { backgroundColor: "#f5f3ff", color: "#1a2333", borderBottomLeftRadius: "4px" }
                  : { backgroundColor: "#2b4fac", color: "#fff", borderBottomRightRadius: "4px" }}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[10px] font-bold"
                style={{ background: "linear-gradient(135deg, #8b5cf6, #6d28d9)" }}>R</div>
              <div className="rounded-2xl px-3.5 py-2.5 flex gap-1.5 items-center"
                style={{ backgroundColor: "#f5f3ff", borderBottomLeftRadius: "4px" }}>
                {[0,1,2].map((i) => <span key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                  style={{ backgroundColor: "#8b5cf6", animationDelay: `${i * 0.15}s` }} />)}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        <form onSubmit={(e) => { e.preventDefault(); send(input); }}
          className="flex gap-2 px-4 py-3" style={{ borderTop: "1px solid #f0f0f0" }}>
          <input value={input} onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Ryder to draft a message..." disabled={loading}
            className="flex-1 text-sm px-4 py-2 rounded-full outline-none"
            style={{ border: "1px solid #e4e8f0", backgroundColor: "#f9fafb", color: "#1a2333" }}
            data-testid="input-reactivation-chat" />
          <button type="submit" disabled={loading || !input.trim()}
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #8b5cf6, #6d28d9)" }}>
            <Send className="w-4 h-4 text-white" />
          </button>
        </form>
      </div>
    </div>
  );
}
