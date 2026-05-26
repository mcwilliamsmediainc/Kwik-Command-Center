import { useState, useRef, useEffect, useMemo } from "react";
import { Send, BarChart2, Zap, Users, TrendingUp } from "lucide-react";
import { useProfile, buildBusinessContext, type BusinessProfile } from "@/context/ProfileContext";

/* ─── System prompt builder ─────────────────────────────────── */
function buildAskPrompt(p: BusinessProfile): string {
  const techLines = p.technicians.map((t) => `- ${t.name} ($${t.pay_rate}/job)`).join("\n");
  return `You are the ${p.business_short_name} Intelligence engine for ${p.business_name} — a ${p.industry.toLowerCase()} business. You have full visibility across the entire business.

${buildBusinessContext(p)}

TEAM ROSTER:
${techLines}
- Pay rate: $${p.pay_rate_per_job}/job flat

OTHER AGENTS IN THIS SYSTEM:
- ${p.agents.customer_faq}: customer FAQ & front desk
- ${p.agents.financial}: financial advisor (HouseCall Pro + QuickBooks)
- ${p.agents.dispatch}: call-center dispatch
- ${p.agents.marketing}: marketing & reviews

YOUR STYLE:
- Give specific, data-driven answers using real numbers when available
- Be concise and direct — no fluff or filler
- Surface actionable insights, not just summaries
- If asked about something not in your data, say so honestly
- Reference technicians by first name`;
}

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

/* ─── Component ──────────────────────────────────────────────── */
export function AskPage() {
  const profile = useProfile();
  const orchestratorName = profile.agents.orchestrator;
  const ASK_SYSTEM = useMemo(() => buildAskPrompt(profile), [profile]);
  const WELCOME: Msg = useMemo(() => ({
    role: "assistant",
    content: `I have real-time visibility across ${profile.business_name} — financials, jobs, customers, technicians, and reviews. Ask me anything about your operations, techs, or growth opportunities.`,
  }), [profile.business_name]);

  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const bottomRef               = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages((prev) => (prev.length === 1 && prev[0].role === "assistant" ? [WELCOME] : prev));
  }, [WELCOME]);

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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 flex-shrink-0">
        {ACTION_CARDS.map((c) => {
          const Icon = c.icon;
          return (
            <button key={c.label} onClick={() => send(c.label)}
              className="bg-white rounded-lg px-3 py-3 md:px-4 md:py-3.5 text-left transition-shadow hover:shadow-md"
              style={{ border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", borderTop: `2px solid ${c.color}` }}
              data-testid={`action-card-${c.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
              <div className="flex items-start justify-between mb-2">
                <p className="text-xs md:text-sm font-bold leading-snug pr-2" style={{ color: "#1a2333" }}>{c.label}</p>
                <div className="p-1.5 rounded-md flex-shrink-0" style={{ backgroundColor: c.bg }}>
                  <Icon className="w-3.5 h-3.5" style={{ color: c.color }} />
                </div>
              </div>
              <p className="text-[10px] md:text-xs" style={{ color: "#6b7a90" }}>{c.desc}</p>
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
            style={{ background: "linear-gradient(135deg, #8b5cf6, #6d28d9)" }}>{orchestratorName[0]}</div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold" style={{ color: "#1a2333" }}>{orchestratorName} · {profile.business_short_name} Intelligence</p>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: "#dcfce7", color: "#15803d" }}>Live Data</span>
            </div>
            <p className="text-xs" style={{ color: "#6b7a90" }}>Full visibility · HouseCall Pro · QuickBooks · Reviews</p>
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
                {m.role === "assistant" ? orchestratorName[0] : <span style={{ color: "#6b7a90" }}>U</span>}
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
                style={{ background: "linear-gradient(135deg, #8b5cf6, #6d28d9)" }}>{orchestratorName[0]}</div>
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
