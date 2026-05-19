import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Bot, DollarSign, Users, FileText, Zap } from "lucide-react";

/* ─── Types ────────────────────────────────────────────────────── */
interface Customer {
  id: string; name: string; phone: string;
  lastJobService: string; lastJobDate: string;
  totalSpent: number; daysSince: number | null;
}
interface DormantCustomer {
  id: string; name: string; phone: string;
  lastJobService: string; lastJobDate: string;
  totalSpent: number; daysSince: number | null;
}
interface CustomersResponse {
  customers: Customer[];
  dormant_customers?: DormantCustomer[];
  dormant_365: number;
  estimates_count: number;
  avg_ltv: number;
  error?: string;
}

/* ─── Helpers ───────────────────────────────────────────────────── */
function fmtDormant(days: number | null): string {
  if (!days) return "Unknown";
  if (days < 60)  return `${days} days`;
  if (days < 365) return `${Math.round(days / 30)} months`;
  const yrs = days / 365;
  return yrs < 1.5 ? "1 year" : `${Math.round(yrs)} years`;
}
function fmtCurrency(n: number) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function avatarColor(name: string) {
  const colors = ["#f97316", "#c2410c", "#b91c1c", "#be185d", "#7c3aed"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return colors[h % colors.length];
}

/* ─── Mock open quotes ─────────────────────────────────────────── */
const OPEN_QUOTES = [
  { name: "James Petrov", service: "Sofa Cleaning",    value: "$145", date: "May 14", age: "4 days" },
  { name: "Rachel Moore", service: "Carpet 3BR",       value: "$225", date: "May 12", age: "6 days" },
  { name: "Pine Plaza",   service: "Commercial Carpet", value: "$480", date: "May 10", age: "8 days" },
];

const REACT_SYSTEM = `You are Ryder, the AI dispatcher for Tulsa Kwik Dry. Draft personalized win-back or quote follow-up messages on behalf of Tulsa Kwik Dry. Be warm, brief, and personal. Reference the specific service or customer history provided. 2-3 sentences max. Do not use generic templates.`;

interface Msg { role: "user" | "assistant"; content: string }
const WELCOME: Msg = {
  role: "assistant",
  content: "I can draft personalized win-back messages or quote follow-ups for you. Just tell me who you'd like to reach out to and I'll write something specific and warm.",
};

/* ─── Component ─────────────────────────────────────────────────── */
export function ReactivationPage() {
  const [winBack,      setWinBack]      = useState<Customer[]>([]);
  const [kpis,         setKpis]         = useState({ dormant: 0, recoverable: 0, quotes: 0 });
  const [dataLoading,  setDataLoading]  = useState(true);
  const [messages,     setMessages]     = useState<Msg[]>([WELCOME]);
  const [input,        setInput]        = useState("");
  const [chatLoading,  setChatLoading]  = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, chatLoading]);

  const loadData = useCallback(async () => {
    try {
      const res  = await fetch("/api/hcp/customers");
      const json = await res.json() as CustomersResponse;
      if (!json.error) {
        const dormant = json.dormant_365 ?? 0;
        const dormantList = (json.dormant_customers ?? []) as DormantCustomer[];
        setWinBack(dormantList.slice(0, 15) as Customer[]);
        setKpis({
          dormant,
          recoverable: Math.round(dormantList.length * (json.avg_ltv ?? 342)),
          quotes: json.estimates_count ?? OPEN_QUOTES.length,
        });
      }
    } catch { /* non-fatal */ }
    finally { setDataLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function send(text: string) {
    if (!text.trim() || chatLoading) return;
    const next: Msg[] = [...messages, { role: "user", content: text.trim() }];
    setMessages(next);
    setInput("");
    setChatLoading(true);
    try {
      const res  = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system: REACT_SYSTEM, messages: next.map((m) => ({ role: m.role, content: m.content })) }),
      });
      const data = await res.json();
      const reply = data.content?.find((b: { type: string; text: string }) => b.type === "text")?.text ?? "Error generating message.";
      setMessages([...next, { role: "assistant", content: reply }]);
    } catch {
      setMessages([...next, { role: "assistant", content: "Error generating message. Please try again." }]);
    } finally { setChatLoading(false); }
  }

  const KPIS = [
    { label: "Est. Recoverable",  value: dataLoading ? "—" : fmtCurrency(kpis.recoverable), sub: "LTV of dormant customers", accent: "#3db54a", Icon: DollarSign },
    { label: "Dormant Customers", value: dataLoading ? "—" : String(kpis.dormant),           sub: "inactive 12mo+",           accent: "#f97316", Icon: Users       },
    { label: "Open Quotes",       value: dataLoading ? "—" : String(kpis.quotes),            sub: "awaiting response",        accent: "#2b4fac", Icon: FileText    },
    { label: "Active Sequences",  value: "3",                                                sub: "campaigns running",        accent: "#8b5cf6", Icon: Zap         },
  ];

  return (
    <div className="flex flex-col gap-4">

      {/* KPIs — Fix 5: 2 cols on mobile */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {KPIS.map(({ label, value, sub, accent, Icon }) => (
          <div key={label} className="bg-white rounded-lg px-4 py-3.5"
            style={{ border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", borderTop: `2px solid ${accent}` }}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase mb-1" style={{ color: "#6b7a90", letterSpacing: "0.6px" }}>{label}</p>
                {dataLoading && label !== "Active Sequences"
                  ? <div className="h-7 w-16 rounded bg-gray-100 animate-pulse mb-0.5" />
                  : <p className="text-2xl font-bold tracking-tight mb-0.5" style={{ color: "#1a2333" }}>{value}</p>}
                <p className="text-xs" style={{ color: "#6b7a90" }}>{sub}</p>
              </div>
              <div className="p-2 rounded-lg" style={{ backgroundColor: `${accent}14` }}>
                <Icon className="w-4 h-4" style={{ color: accent }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Two-column — Fix 5: single column on mobile */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Open Quotes */}
        <div className="bg-white rounded-lg overflow-hidden"
          style={{ border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div className="px-5 py-3.5" style={{ borderBottom: "1px solid #f0f0f0" }}>
            <p className="text-sm font-bold" style={{ color: "#1a2333" }}>Open Quotes</p>
          </div>
          {/* Fix 5: card padding, spacing, font size, stacked buttons on mobile */}
          {OPEN_QUOTES.map((q) => (
            <div key={q.name} className="px-4 md:px-5 py-4 flex flex-col gap-3"
              style={{ borderBottom: "1px solid #f0f0f0", marginBottom: 0 }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: "#2b4fac" }}>{q.name[0]}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold" style={{ color: "#1a2333", fontSize: 14 }}>{q.name}</p>
                  <p className="text-xs" style={{ color: "#6b7a90" }}>{q.service} · {q.date} · {q.age} old</p>
                </div>
                <span className="text-sm font-bold flex-shrink-0" style={{ color: "#3db54a" }}>{q.value}</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => send(`Draft a follow-up message for ${q.name} who received a quote for ${q.service} (${q.value}) ${q.age} ago with no response.`)}
                  className="flex-1 text-xs font-semibold px-3 py-2.5 rounded-md min-h-[40px]"
                  style={{ backgroundColor: "#eff6ff", color: "#2b4fac", border: "1px solid #bfdbfe" }}
                  data-testid={`button-draft-quote-${q.name.toLowerCase().replace(/\s+/g, "-")}`}>
                  Draft Message
                </button>
                <button className="flex-1 text-xs font-semibold px-3 py-2.5 rounded-md min-h-[40px]"
                  style={{ backgroundColor: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca" }}>
                  Mark Lost
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Win-Back Queue */}
        <div className="bg-white rounded-lg overflow-hidden"
          style={{ border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderBottom: "1px solid #f0f0f0" }}>
            <p className="text-sm font-bold" style={{ color: "#1a2333" }}>Win-Back Queue</p>
            {!dataLoading && (
              <span className="text-xs" style={{ color: "#6b7a90" }}>Top {winBack.length} · 12mo+ dormant</span>
            )}
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 320 }}>
            {dataLoading && (
              <div className="p-4 space-y-2">
                {[...Array(5)].map((_, i) => <div key={i} className="h-10 rounded bg-gray-50 animate-pulse" />)}
              </div>
            )}
            {!dataLoading && winBack.length === 0 && (
              <div className="px-5 py-8 text-center text-sm" style={{ color: "#6b7a90" }}>
                No customers dormant 12+ months found.
              </div>
            )}
            {winBack.map((c) => (
              <div key={c.id} className="px-4 md:px-5 py-4 flex items-center gap-3"
                style={{ borderBottom: "1px solid #f5f5f5" }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: avatarColor(c.name) }}>{c.name[0]}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate" style={{ color: "#1a2333", fontSize: 14 }}>{c.name}</p>
                  <p className="text-xs" style={{ color: "#6b7a90" }}>
                    {c.lastJobService ? `${c.lastJobService.slice(0, 28)}${c.lastJobService.length > 28 ? "…" : ""}` : "No recent jobs"} · {fmtDormant(c.daysSince)}
                  </p>
                </div>
                <span className="text-xs font-semibold flex-shrink-0" style={{ color: "#6b7a90" }}>
                  {c.totalSpent > 0 ? fmtCurrency(c.totalSpent) : "—"}
                </span>
                <button
                  onClick={() => send(`Draft a warm win-back message for ${c.name} who last used Tulsa Kwik Dry for ${c.lastJobService || "carpet cleaning"} and has been dormant for ${fmtDormant(c.daysSince)}. Their lifetime value is ${c.totalSpent > 0 ? fmtCurrency(c.totalSpent) : "unknown"}.`)}
                  className="text-xs font-semibold px-2.5 py-1.5 rounded-md flex-shrink-0 min-h-[36px]"
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
          {chatLoading && (
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
            placeholder="Ask Ryder to draft a message..." disabled={chatLoading}
            className="flex-1 text-sm px-4 rounded-full outline-none min-h-[44px]"
            style={{ border: "1px solid #e4e8f0", backgroundColor: "#f9fafb", color: "#1a2333" }}
            data-testid="input-reactivation-chat" />
          <button type="submit" disabled={chatLoading || !input.trim()}
            className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #8b5cf6, #6d28d9)" }}>
            <Send className="w-4 h-4 text-white" />
          </button>
        </form>
      </div>
    </div>
  );
}
