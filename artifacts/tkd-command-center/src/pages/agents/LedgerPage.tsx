import { useState, useRef, useEffect } from "react";
import { Send, TrendingUp, TrendingDown, DollarSign, Clock, CreditCard } from "lucide-react";

/* ─── Finn system prompt ─────────────────────────────────────── */
const FINN_PROMPT = `You are Finn, the AI financial advisor for Tulsa Kwik Dry — a carpet cleaning and restoration company in Tulsa, Oklahoma. You are connected to their QuickBooks account and have real-time access to their financial data.

CURRENT FINANCIALS (May 2026):
- Revenue: $8,240
  - Carpet Cleaning: $4,120
  - Upholstery: $1,840
  - Air Duct Cleaning: $1,494
  - Other Services: $786
- Total Expenses: $3,180
  - Supplies & Materials: $480 (5.8% of revenue — healthy, benchmark 3–8%)
  - Contractor Pay: $1,840 (22.3% of revenue — within benchmark 18–25%)
  - Marketing & Ads: $620 (7.5% of revenue — within benchmark 5–10%)
  - Software & Tools: $240 (2.9% of revenue — low)
- Net Profit: $5,060 (61% margin — excellent, cleaning industry avg is 35–50%)
- vs April: Revenue up 14%

PAYROLL:
- Peyton: 18 jobs · $720 due
- Anthony: 15 jobs · $600 due
- Evan: 13 jobs · $520 due
- Total payroll due: $1,840 · Due date: May 15

INDUSTRY BENCHMARKS (residential cleaning):
- Labor/contractor: 18–25% of revenue
- Marketing: 5–10% of revenue
- Supplies: 3–8% of revenue
- Net margin: 35–50% (Tulsa Kwik Dry is outperforming at 61%)

YOUR STYLE:
- Give specific, actionable advice using the actual numbers above
- Be concise and direct — no fluff
- Flag anything unusual or worth watching
- Always recommend consulting a CPA for tax and legal matters
- Never make up data — only use what is provided above`;

/* ─── Types ──────────────────────────────────────────────────── */
interface Msg {
  role: "user" | "assistant";
  content: string;
}

/* ─── Static data ─────────────────────────────────────────────── */
const KPIS = [
  {
    label: "Monthly Revenue",
    value: "$8,240",
    sub: "↑14% vs April",
    color: "#3db54a",
    icon: TrendingUp,
    positive: true,
  },
  {
    label: "Total Expenses",
    value: "$3,180",
    sub: "on budget",
    color: "#ef4444",
    icon: TrendingDown,
    positive: false,
  },
  {
    label: "Net Profit",
    value: "$5,060",
    sub: "61% margin",
    color: "#2b4fac",
    icon: DollarSign,
    positive: true,
  },
  {
    label: "Payroll Due",
    value: "$1,840",
    sub: "in 4 days · May 15",
    color: "#d97706",
    icon: Clock,
    positive: null,
  },
];

const PNL_INCOME = [
  { label: "Carpet Cleaning",   value: "+$4,120" },
  { label: "Upholstery",        value: "+$1,840" },
  { label: "Air Duct Cleaning", value: "+$1,494" },
  { label: "Other Services",    value: "+$786"   },
];

const PNL_EXPENSES = [
  { label: "Supplies & Materials", value: "-$480"   },
  { label: "Contractor Pay",       value: "-$1,840" },
  { label: "Marketing & Ads",      value: "-$620"   },
  { label: "Software & Tools",     value: "-$240"   },
];

const TECHS = [
  { name: "Peyton",  jobs: 18, pay: "$720", avatarBg: "#2b4fac" },
  { name: "Anthony", jobs: 15, pay: "$600", avatarBg: "#f97316" },
  { name: "Evan",    jobs: 13, pay: "$520", avatarBg: "#3db54a" },
];

const QUICK_ACTIONS = [
  "Monthly check-in",
  "Expense check",
  "What to watch",
  "Benchmark me",
  "Revenue pace",
];

const WELCOME: Msg = {
  role: "assistant",
  content:
    "Hey — I'm Finn, your QuickBooks-connected financial advisor for Tulsa Kwik Dry. I can review your P&L, flag unusual expenses, benchmark your margins against other cleaning businesses, and give you specific advice on what to watch. What would you like to dig into?",
};

/* ─── Component ──────────────────────────────────────────────── */
export function LedgerPage() {
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const bottomRef               = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;
    const userMsg: Msg = { role: "user", content: text.trim() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: FINN_PROMPT,
          messages: next.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = (await res.json()) as {
        content?: Array<{ type: string; text: string }>;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      const reply =
        data.content?.find((b) => b.type === "text")?.text ??
        "Sorry, I couldn't generate a response.";
      setMessages([...next, { role: "assistant", content: reply }]);
    } catch (err) {
      setMessages([
        ...next,
        {
          role: "assistant",
          content: `Error: ${err instanceof Error ? err.message : "Something went wrong."}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-108px)]">

      {/* ── KPI row ── */}
      <div className="grid grid-cols-4 gap-4 flex-shrink-0">
        {KPIS.map((k) => {
          const Icon = k.icon;
          return (
            <div
              key={k.label}
              className="bg-white rounded-lg px-4 py-3.5"
              style={{
                border: "1px solid rgba(0,0,0,0.07)",
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                borderTop: `2px solid ${k.color}`,
              }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p
                    className="text-xs font-medium uppercase mb-1"
                    style={{ color: "#6b7a90", letterSpacing: "0.6px" }}
                  >
                    {k.label}
                  </p>
                  <p className="text-2xl font-bold tracking-tight mb-0.5" style={{ color: "#1a2333" }}>
                    {k.value}
                  </p>
                  <p
                    className="text-xs font-medium"
                    style={{ color: k.positive === true ? "#3db54a" : k.positive === false ? "#ef4444" : "#d97706" }}
                  >
                    {k.sub}
                  </p>
                </div>
                <div
                  className="p-2 rounded-lg flex-shrink-0"
                  style={{ backgroundColor: `${k.color}14` }}
                >
                  <Icon className="w-4 h-4" style={{ color: k.color }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Two-column layout ── */}
      <div className="flex gap-4 flex-1 min-h-0">

        {/* Left — Finn chat (wider) */}
        <div
          className="flex-1 bg-white rounded-lg flex flex-col min-h-0 min-w-0"
          style={{ border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
        >
          {/* Finn header */}
          <div
            className="flex items-center gap-3 px-5 py-3.5 flex-shrink-0"
            style={{ borderBottom: "1px solid #f0f0f0" }}
          >
            {/* Finn avatar */}
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-bold"
              style={{ background: "linear-gradient(135deg, #3db54a, #2b9e38)" }}
            >
              F
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold" style={{ color: "#1a2333" }}>Finn</p>
                <span
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: "#dcfce7", color: "#15803d" }}
                >
                  Connected
                </span>
              </div>
              <p className="text-xs" style={{ color: "#6b7a90" }}>
                AI Financial Advisor · Connected to QuickBooks
              </p>
            </div>
          </div>

          {/* Quick actions */}
          <div
            className="px-5 py-2.5 flex gap-2 flex-wrap flex-shrink-0"
            style={{ borderBottom: "1px solid #f5f5f5" }}
          >
            {QUICK_ACTIONS.map((q) => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                disabled={loading}
                className="text-xs font-medium px-3 py-1.5 rounded-full transition-colors disabled:opacity-50"
                style={{ border: "1px solid #bbf7d0", color: "#15803d", backgroundColor: "#f0fdf4" }}
                data-testid={`quick-action-${q.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {q}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                {/* Avatar */}
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-white text-xs font-bold"
                  style={{
                    background:
                      msg.role === "assistant"
                        ? "linear-gradient(135deg, #3db54a, #2b9e38)"
                        : "#f0f2f5",
                  }}
                >
                  {msg.role === "assistant" ? "F" : <span style={{ color: "#6b7a90" }}>U</span>}
                </div>

                <div
                  className="max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed"
                  style={
                    msg.role === "assistant"
                      ? { backgroundColor: "#f0fdf4", color: "#1a2333", borderBottomLeftRadius: "4px" }
                      : { backgroundColor: "#2b4fac", color: "#fff", borderBottomRightRadius: "4px" }
                  }
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-start gap-3">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
                  style={{ background: "linear-gradient(135deg, #3db54a, #2b9e38)" }}
                >
                  F
                </div>
                <div
                  className="rounded-2xl px-4 py-3 flex gap-1.5 items-center"
                  style={{ backgroundColor: "#f0fdf4", borderBottomLeftRadius: "4px" }}
                >
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full animate-bounce"
                      style={{ backgroundColor: "#3db54a", animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
            className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
            style={{ borderTop: "1px solid #f0f0f0" }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Finn about your finances..."
              disabled={loading}
              className="flex-1 text-sm px-4 py-2.5 rounded-full outline-none disabled:opacity-60"
              style={{ border: "1px solid #e4e8f0", backgroundColor: "#f9fafb", color: "#1a2333" }}
              data-testid="input-finn-chat"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-40"
              style={{ backgroundColor: "#3db54a" }}
              data-testid="button-finn-send"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </form>
        </div>

        {/* Right — P&L + Payroll stacked */}
        <div className="w-[280px] flex-shrink-0 flex flex-col gap-4 min-h-0 overflow-y-auto">

          {/* P&L Summary */}
          <div
            className="bg-white rounded-lg overflow-hidden flex-shrink-0"
            style={{ border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
          >
            <div className="px-4 py-3.5" style={{ borderBottom: "1px solid #f0f0f0" }}>
              <p className="text-xs font-semibold uppercase" style={{ color: "#6b7a90", letterSpacing: "0.6px" }}>
                P&L Summary · May 2026
              </p>
            </div>
            <div className="px-4 py-3 space-y-1.5">
              {PNL_INCOME.map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: "#6b7a90" }}>{row.label}</span>
                  <span className="text-xs font-semibold" style={{ color: "#3db54a" }}>{row.value}</span>
                </div>
              ))}
            </div>
            <div className="mx-4 border-t border-dashed border-gray-200 my-0.5" />
            <div className="px-4 py-2 flex items-center justify-between">
              <span className="text-xs font-bold" style={{ color: "#1a2333" }}>Total Revenue</span>
              <span className="text-xs font-bold" style={{ color: "#3db54a" }}>+$8,240</span>
            </div>
            <div className="px-4 pb-3 pt-1 space-y-1.5">
              {PNL_EXPENSES.map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: "#6b7a90" }}>{row.label}</span>
                  <span className="text-xs font-semibold" style={{ color: "#ef4444" }}>{row.value}</span>
                </div>
              ))}
            </div>
            <div className="mx-4 border-t border-dashed border-gray-200 my-0.5" />
            <div className="px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-bold" style={{ color: "#1a2333" }}>Net Profit</span>
              <span className="text-sm font-bold" style={{ color: "#2b4fac" }}>+$5,060</span>
            </div>
          </div>

          {/* Technician Pay */}
          <div
            className="bg-white rounded-lg overflow-hidden flex-shrink-0"
            style={{ border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
          >
            <div className="px-4 py-3.5" style={{ borderBottom: "1px solid #f0f0f0" }}>
              <p className="text-xs font-semibold uppercase" style={{ color: "#6b7a90", letterSpacing: "0.6px" }}>
                Technician Pay
              </p>
            </div>
            <div className="px-4 py-3 space-y-3">
              {TECHS.map((tech) => (
                <div key={tech.name} className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: tech.avatarBg }}
                  >
                    {tech.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold" style={{ color: "#1a2333" }}>{tech.name}</p>
                    <p className="text-[11px]" style={{ color: "#6b7a90" }}>{tech.jobs} jobs</p>
                  </div>
                  <span className="text-sm font-bold" style={{ color: "#1a2333" }}>{tech.pay}</span>
                </div>
              ))}
            </div>
            <div className="mx-4 border-t border-gray-100 my-0" />
            <div className="px-4 py-3 flex items-center justify-between">
              <span className="text-xs font-bold" style={{ color: "#1a2333" }}>Total Due</span>
              <span className="text-sm font-bold" style={{ color: "#d97706" }}>$1,840</span>
            </div>
            <div className="px-4 pb-4">
              <button
                className="w-full py-2.5 rounded-lg text-xs font-bold text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
                style={{ backgroundColor: "#2b4fac" }}
                data-testid="button-process-payroll"
              >
                <CreditCard className="w-3.5 h-3.5" />
                Process Payroll
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
