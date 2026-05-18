import { useState, useRef, useEffect } from "react";
import { Send, BarChart2, Zap, Users, Heart } from "lucide-react";

/* ─── System prompt ──────────────────────────────────────────── */
const ASK_SYSTEM = `You are the TKD Intelligence engine for Tulsa Kwik Dry — a carpet cleaning company in Tulsa, Oklahoma. You have full visibility across the entire business:

RYDER (Dispatch/Sales AI):
- 47 messages handled today, 94% responded in under 1 minute
- 3 pending approvals, top conversation: Sandra Williams (sectional quote, $145–$175)
- Common inquiries: sectional cleaning, carpet 3BR, air duct add-ons

FINN (Financial Advisor):
- May revenue: $8,240 (↑14% vs April)
- Expenses: $3,180 | Net profit: $5,060 (61% margin)
- Payroll due: $1,840 (Peyton $720, Anthony $600, Evan $520)

DISPATCH:
- 5 active threads, 3 need approval
- Today's jobs: 5 scheduled, 2 in progress, 3 complete

SCOUT (Marketing):
- Google rating: 5.0★ (506 reviews, ↑3 this week)
- Ad spend: $450 MTD, $12.40/lead
- Email open rate: 34%, top lead source: Google Search (42%)

JOB PIPELINE:
- Technicians: Peyton (18 jobs), Anthony (15 jobs), Evan (13 jobs)
- Top services: Carpet Cleaning $4,120, Upholstery $1,840, Air Ducts $1,494

CUSTOMERS:
- 247 total, 31 dormant 12mo+, 6 open quotes
- Avg LTV: $342

YOUR STYLE:
- Give specific, data-driven answers using the numbers above
- Be concise and direct — no fluff
- Surface actionable insights, not just data summaries
- If asked about something outside this data, say so honestly`;

/* ─── Quick action cards ─────────────────────────────────────── */
const ACTION_CARDS = [
  { label: "Monthly check-in", desc: "Overall business health recap", icon: BarChart2, color: "#2b4fac", bg: "#eff6ff" },
  { label: "Focus this week",  desc: "Top priorities to drive growth", icon: Zap,       color: "#f97316", bg: "#fff7ed" },
  { label: "Follow-ups",       desc: "Dormant customers & open quotes", icon: Users,    color: "#3db54a", bg: "#f0fdf4" },
  { label: "Health report",    desc: "Revenue, margins & benchmarks",   icon: Heart,    color: "#8b5cf6", bg: "#f5f3ff" },
];

const QUICK_CHIPS = [
  "Monthly check-in",
  "Who needs follow-up?",
  "How are the techs performing?",
  "Any red flags this week?",
  "What's our best lead source?",
];

/* ─── Types ──────────────────────────────────────────────────── */
interface Msg { role: "user" | "assistant"; content: string }

const WELCOME: Msg = {
  role: "assistant",
  content:
    "I have full visibility across your business — Ryder's interactions, Finn's financial data, Dispatch activity, Scout signals, and your job pipeline. Ask me anything.",
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
              data-testid={`action-card-${c.label.toLowerCase().replace(/\s+/g, "-")}`}>
              <div className="flex items-start justify-between mb-2">
                <p className="text-sm font-bold" style={{ color: "#1a2333" }}>{c.label}</p>
                <div className="p-1.5 rounded-md" style={{ backgroundColor: c.bg }}>
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
            style={{ background: "linear-gradient(135deg, #8b5cf6, #6d28d9)" }}>
            TK
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold" style={{ color: "#1a2333" }}>TKD Intelligence</p>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: "#f5f3ff", color: "#6d28d9" }}>Full Access</span>
            </div>
            <p className="text-xs" style={{ color: "#6b7a90" }}>Connected to Ryder · Finn · Dispatch · Scout · Jobs</p>
          </div>
        </div>

        {/* Quick chips */}
        <div className="px-5 py-2.5 flex gap-2 flex-wrap flex-shrink-0" style={{ borderBottom: "1px solid #f5f5f5" }}>
          {QUICK_CHIPS.map((q) => (
            <button key={q} onClick={() => send(q)} disabled={loading}
              className="text-xs font-medium px-3 py-1.5 rounded-full transition-colors disabled:opacity-50"
              style={{ border: "1px solid #ddd6fe", color: "#6d28d9", backgroundColor: "#f5f3ff" }}
              data-testid={`chip-${q.toLowerCase().replace(/\s+/g, "-").replace(/[?']/g, "")}`}>
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
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
                style={{ background: "linear-gradient(135deg, #8b5cf6, #6d28d9)" }}>TK</div>
              <div className="rounded-2xl px-4 py-3 flex gap-1.5 items-center"
                style={{ backgroundColor: "#f5f3ff", borderBottomLeftRadius: "4px" }}>
                {[0, 1, 2].map((i) => (
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
            className="flex-1 text-sm px-4 py-2.5 rounded-full outline-none disabled:opacity-60"
            style={{ border: "1px solid #e4e8f0", backgroundColor: "#f9fafb", color: "#1a2333" }}
            data-testid="input-ask-chat" />
          <button type="submit" disabled={loading || !input.trim()}
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #8b5cf6, #6d28d9)" }}
            data-testid="button-ask-send">
            <Send className="w-4 h-4 text-white" />
          </button>
        </form>
      </div>
    </div>
  );
}
