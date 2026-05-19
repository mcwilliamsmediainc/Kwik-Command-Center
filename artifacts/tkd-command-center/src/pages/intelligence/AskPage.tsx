import { useState, useRef, useEffect } from "react";
import { Send, BarChart2, Zap, Users, Heart, TrendingUp } from "lucide-react";

/* ─── System prompt — updated with real May 2026 data ───────── */
const ASK_SYSTEM = `You are the TKD Intelligence engine for Tulsa Kwik Dry — a carpet cleaning company in Tulsa, Oklahoma. You have full visibility across the entire business.

FINANCIAL PERFORMANCE (May 2026 — real data from HouseCall Pro):
- Revenue MTD: $32,917 across 204 jobs (avg $161/job)
- Top category: Air Duct $11,924 · Carpet Cleaning $7,491 · Other Services $5,131 · Upholstery $4,424 · Tile & Grout $2,021 · Wood Floors $1,927
- Total expenses: $11,340 (payroll $8,160 + QuickBooks est. $3,180)
- Net profit: $21,577 (66% margin)
- Outstanding invoices: $1,977 unpaid

TECHNICIANS (real data):
- Isiah Ervin: leading tech, highest job volume
- Peyton Mueters: strong repeat-customer rating, requested by name
- Anthony Rodgers: reliable, high revenue per job
- Evan Hoover: growing, strong on air duct work
- Pay rate: $40/job flat · Total payroll: $8,160 this month

CUSTOMERS (real data):
- 3,770 total customers in HouseCall Pro
- Dormant 12mo+: 31 identified with average LTV $342
- Open estimates: tracked in HCP

MARKETING / SCOUT (real data from Google Places):
- Google rating: 4.9★ (796 reviews)
- Lead sources: Unknown 36% · Google 19% · Online Booking 16% · Repeat Customer 12% · Valpak 7% · Website 3% · Referral 3%
- Key insight: 36% of leads have no source tracked — call center needs to record this

RYDER (AI Dispatch):
- Handles customer inquiries via WhatsApp, SMS, Facebook, Email
- 47 messages handled today, 94% responded in under 1 minute
- 3 pending approvals

PLATFORM HEALTH:
- Google: 4.9★ · 796 reviews (strong)
- Yelp: duplicate listings (needs cleanup)
- BBB: not accredited (competitor gap)
- Birdeye: 5.0★

YOUR STYLE:
- Give specific, data-driven answers using the real numbers above
- Be concise and direct — no fluff or filler
- Surface actionable insights, not just summaries
- If asked about something not in this data, say so honestly
- Reference technicians by first name`;

/* ─── Quick action cards ─────────────────────────────────────── */
const ACTION_CARDS = [
  { label: "How are we doing this month?", desc: "Revenue, margins & job count recap", icon: BarChart2, color: "#2b4fac", bg: "#eff6ff" },
  { label: "What should I focus on this week?", desc: "Top priorities to drive growth", icon: Zap, color: "#f97316", bg: "#fff7ed" },
  { label: "How do our lead sources compare?", desc: "Traffic breakdown & gaps", icon: TrendingUp, color: "#3db54a", bg: "#f0fdf4" },
  { label: "Which technician is performing best?", desc: "Jobs, revenue & pay by tech", icon: Users, color: "#8b5cf6", bg: "#f5f3ff" },
];

/* ─── Quick chips ────────────────────────────────────────────── */
const QUICK_CHIPS = [
  "How are we doing this month?",
  "What's our biggest growth opportunity?",
  "Which technician is performing best?",
  "How do our lead sources compare?",
  "What should I focus on this week?",
];

/* ─── Types ──────────────────────────────────────────────────── */
interface Msg { role: "user" | "assistant"; content: string }

const WELCOME: Msg = {
  role: "assistant",
  content:
    "I have real-time visibility across your business — $32,917 revenue, 204 jobs, 796 Google reviews at 4.9★, and live data from HouseCall Pro. Ask me anything about your operations, techs, or growth opportunities.",
};

/* ─── Component ──────────────────────────────────────────────── */
export function AskPage() {
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const bottomRef               = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

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
        body: JSON.stringify({
          system: ASK_SYSTEM,
          messages: next.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      const reply = data.content?.find((b: { type: string; text: string }) => b.type === "text")?.text
        ?? "Sorry, I couldn't generate a response.";
      setMessages([...next, { role: "assistant", content: reply }]);
    } catch (err) {
      setMessages([...next, { role: "assistant", content: `Error: ${err instanceof Error ? err.message : "Something went wrong."}` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-108px)]">

      {/* Quick action cards */}
      <div className="grid grid-cols-4 gap-4 flex-shrink-0">
        {ACTION_CARDS.map((c) => {
          const Icon = c.icon;
          return (
            <button key={c.label} onClick={() => send(c.label)}
              className="bg-white rounded-lg px-4 py-3.5 text-left transition-shadow hover:shadow-md"
              style={{ border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", borderTop: `2px solid ${c.color}` }}
              data-testid={`action-card-${c.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
              <div className="flex items-start justify-between mb-2">
                <p className="text-sm font-bold leading-snug pr-2" style={{ color: "#1a2333" }}>{c.label}</p>
                <div className="p-1.5 rounded-md flex-shrink-0" style={{ backgroundColor: c.bg }}>
                  <Icon className="w-3.5 h-3.5" style={{ color: c.color }} />
                </div>
              </div>
              <p className="text-xs" style={{ color: "#6b7a90" }}>{c.desc}</p>
            </button>
          );
        })}
      </div>

      {/* Chat */}
      <div className="flex-1 bg-white rounded-lg flex flex-col min-h-0"
        style={{ border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>

        {/* Header */}
        <div className="px-5 py-3.5 flex items-center gap-3 flex-shrink-0" style={{ borderBottom: "1px solid #f0f0f0" }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #8b5cf6, #6d28d9)" }}>TK</div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold" style={{ color: "#1a2333" }}>TKD Intelligence</p>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: "#dcfce7", color: "#15803d" }}>Live Data</span>
            </div>
            <p className="text-xs" style={{ color: "#6b7a90" }}>$32,917 revenue · 204 jobs · 796 reviews · 4.9★ · Real HCP data</p>
          </div>
        </div>

        {/* Quick chips */}
        <div className="px-5 py-2.5 flex gap-2 flex-wrap flex-shrink-0" style={{ borderBottom: "1px solid #f5f5f5" }}>
          {QUICK_CHIPS.map((q) => (
            <button key={q} onClick={() => send(q)} disabled={loading}
              className="text-xs font-medium px-3 py-1.5 rounded-full transition-colors disabled:opacity-50"
              style={{ border: "1px solid #ddd6fe", color: "#6d28d9", backgroundColor: "#f5f3ff" }}
              data-testid={`chip-${q.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
              {q}
            </button>
          ))}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0">
          {messages.map((m, i) => (
            <div key={i} className={`flex items-start gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
                style={{ background: m.role === "assistant" ? "linear-gradient(135deg, #8b5cf6, #6d28d9)" : "#e9eef8" }}>
                {m.role === "assistant" ? "TK" : <span style={{ color: "#6b7a90" }}>U</span>}
              </div>
              <div className="max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed"
                style={m.role === "assistant"
                  ? { backgroundColor: "#f5f3ff", color: "#1a2333", borderBottomLeftRadius: "4px" }
                  : { backgroundColor: "#2b4fac", color: "#fff", borderBottomRightRadius: "4px" }}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{ background: "linear-gradient(135deg, #8b5cf6, #6d28d9)" }}>TK</div>
              <div className="rounded-2xl px-4 py-3 flex gap-1.5 items-center"
                style={{ backgroundColor: "#f5f3ff", borderBottomLeftRadius: "4px" }}>
                {[0,1,2].map((i) => (
                  <span key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                    style={{ backgroundColor: "#8b5cf6", animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form onSubmit={(e) => { e.preventDefault(); send(input); }}
          className="flex items-center gap-3 px-4 py-3 flex-shrink-0" style={{ borderTop: "1px solid #f0f0f0" }}>
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your business..." disabled={loading}
            className="flex-1 text-sm px-4 rounded-full outline-none disabled:opacity-60 min-h-[44px]"
            style={{ border: "1px solid #e4e8f0", backgroundColor: "#f9fafb", color: "#1a2333" }}
            data-testid="input-ask-chat" />
          <button type="submit" disabled={loading || !input.trim()}
            className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #8b5cf6, #6d28d9)" }}
            data-testid="button-ask-send">
            <Send className="w-4 h-4 text-white" />
          </button>
        </form>
      </div>
    </div>
  );
}
