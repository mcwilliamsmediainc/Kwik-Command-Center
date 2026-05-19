import { useState, useRef, useEffect, useCallback } from "react";
import { Send, CreditCard, RefreshCw, X, FileText } from "lucide-react";

/* ─── Types ──────────────────────────────────────────────────── */
interface Msg { role: "user" | "assistant"; content: string; }

interface TechData {
  name: string; color: string; jobs: number; revenue: number; pay: number;
}
interface CategoryData { label: string; amount: number; }
interface OutstandingInvoice {
  id: string; invoiceNumber: string; customerName: string; amount: number; invoiceDate: string;
}
interface FinancialsData {
  month: string;
  totalRevenue: number;
  jobCount: number;
  totalJobItems: number;
  paidTotal: number;
  paidCount: number;
  outstandingTotal: number;
  outstandingInvoices: OutstandingInvoice[];
  avgJobValue: number;
  revenueByCategory: CategoryData[];
  techs: TechData[];
  payrollTotal: number;
  syncedAt: string;
}

/* Mocked QB expenses — no QuickBooks integration yet */
const QB_EXPENSES = {
  total: 3180,
  rows: [
    { label: "Supplies & Materials", value: 480 },
    { label: "Marketing & Ads",      value: 620 },
    { label: "Software & Tools",     value: 240 },
  ],
};

function buildFinnPrompt(data: FinancialsData): string {
  const catLines  = data.revenueByCategory.map(c => `  - ${c.label}: $${c.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`).join("\n");
  const techLines = data.techs.map(t => `- ${t.name}: ${t.jobs} jobs · $${t.pay} due`).join("\n");
  const netProfit = data.totalRevenue - QB_EXPENSES.total - data.payrollTotal;
  const margin    = data.totalRevenue > 0 ? Math.round((netProfit / data.totalRevenue) * 100) : 0;

  return `You are Finn, the AI financial advisor for Tulsa Kwik Dry — a carpet cleaning and restoration company in Tulsa, Oklahoma. You have real-time access to HouseCall Pro financial data.

CURRENT FINANCIALS (${data.month}) — LIVE FROM HOUSECALL PRO:
- Total Revenue (from ${data.jobCount} of ${data.totalJobItems} jobs): $${data.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
  Revenue by service:
${catLines}
- Paid Invoices: $${data.paidTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })} (${data.paidCount} invoices)
- Outstanding Balance: $${data.outstandingTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })} (${(data.outstandingInvoices ?? []).length} unpaid invoices)
- Avg Job Value: $${data.avgJobValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}

EXPENSES (QuickBooks — estimated):
- Supplies & Materials: $480
- Marketing & Ads: $620
- Software & Tools: $240
- Contractor/Tech Payroll: $${data.payrollTotal.toLocaleString()} (real, from HCP job counts)
- Total Estimated Expenses: $${(QB_EXPENSES.total + data.payrollTotal).toLocaleString()}

NET PROFIT (estimated): $${netProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })} (${margin}% margin)

PAYROLL (${data.month}) — REAL DATA:
${techLines}
- Total payroll due: $${data.payrollTotal.toLocaleString()} · $40/job flat rate

INDUSTRY BENCHMARKS (residential cleaning):
- Labor/contractor: 18–25% of revenue
- Marketing: 5–10% of revenue
- Supplies: 3–8% of revenue
- Net margin: 35–50%

YOUR STYLE:
- Give specific, actionable advice using the actual numbers above
- Be concise and direct — no fluff
- Flag anything unusual or worth watching
- Always recommend consulting a CPA for tax and legal matters
- Never make up data — only use what is provided above`;
}

const EMPTY_FINN_PROMPT = buildFinnPrompt({
  month: "May 2026", totalRevenue: 0, jobCount: 0, totalJobItems: 0,
  paidTotal: 0, paidCount: 0, outstandingTotal: 0, outstandingInvoices: [],
  avgJobValue: 0, revenueByCategory: [], techs: [], payrollTotal: 0, syncedAt: new Date().toISOString(),
});

const WELCOME: Msg = {
  role: "assistant",
  content: "Hey — I'm Finn, your financial advisor for Tulsa Kwik Dry. I'm loading live data from HouseCall Pro right now. Once it's in, I can review your P&L, flag unusual expenses, benchmark your margins, and give you specific advice. What would you like to dig into?",
};

function fmt$(n: number): string {
  return "$" + n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}
function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true,
    timeZone: "America/Chicago",
  });
}
function fmtDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/Chicago" });
}

/* ─── Outstanding Modal ──────────────────────────────────────── */
function OutstandingModal({ invoices, total, onClose }: {
  invoices: OutstandingInvoice[];
  total: number;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden"
        style={{ border: "1px solid rgba(0,0,0,0.1)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid #f0f0f0" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#fff7ed" }}>
              <FileText className="w-4 h-4" style={{ color: "#d97706" }} />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: "#1a2333" }}>Unpaid Invoices</p>
              <p className="text-xs" style={{ color: "#6b7a90" }}>{invoices.length} outstanding · {fmt$(total)} total</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-colors hover:bg-gray-100"
          >
            <X className="w-4 h-4" style={{ color: "#6b7a90" }} />
          </button>
        </div>

        {/* Invoice list */}
        <div className="overflow-y-auto" style={{ maxHeight: "360px" }}>
          {invoices.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: "#6b7a90" }}>No outstanding invoices</p>
          ) : (
            invoices.map((inv, i) => (
              <div
                key={inv.id}
                className="flex items-center justify-between px-5 py-3"
                style={{ borderTop: i > 0 ? "1px solid #f5f5f5" : undefined }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: "#d97706" }}
                  >
                    {inv.customerName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: "#1a2333" }}>{inv.customerName}</p>
                    <p className="text-[11px]" style={{ color: "#6b7a90" }}>
                      {inv.invoiceNumber ? `#${inv.invoiceNumber} · ` : ""}{fmtDate(inv.invoiceDate)}
                    </p>
                  </div>
                </div>
                <div className="flex-shrink-0 ml-3 text-right">
                  <span
                    className="text-sm font-bold"
                    style={{ color: inv.amount > 500 ? "#ef4444" : "#d97706" }}
                  >
                    {fmt$(inv.amount)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderTop: "1px solid #f0f0f0", backgroundColor: "#fafafa" }}
        >
          <span className="text-xs font-bold" style={{ color: "#1a2333" }}>Total Outstanding</span>
          <span className="text-sm font-bold" style={{ color: "#d97706" }}>{fmt$(total)}</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Component ──────────────────────────────────────────────── */
export function LedgerPage() {
  const [messages, setMessages]       = useState<Msg[]>([WELCOME]);
  const [input, setInput]             = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [data, setData]               = useState<FinancialsData | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [showOutstanding, setShowOutstanding] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    setDataLoading(true);
    try {
      const res  = await fetch("/api/hcp/financials");
      const json = await res.json() as FinancialsData;
      if (res.ok && !("error" in json)) setData(json);
    } catch { /* non-fatal */ }
    finally { setDataLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, chatLoading]);

  /* Derived numbers */
  const revenue     = data?.totalRevenue ?? 0;
  const payroll     = data?.payrollTotal ?? 0;
  const totalExp    = QB_EXPENSES.total + payroll;
  const netProfit   = revenue - totalExp;
  const margin      = revenue > 0 ? Math.round((netProfit / revenue) * 100) : 0;
  const outstanding = data?.outstandingTotal ?? 0;
  const finnPrompt  = data ? buildFinnPrompt(data) : EMPTY_FINN_PROMPT;

  async function sendMessage(text: string) {
    if (!text.trim() || chatLoading) return;
    const userMsg: Msg = { role: "user", content: text.trim() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setChatLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: finnPrompt,
          messages: next.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const json = await res.json() as { content?: { type: string; text: string }[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      const reply = json.content?.find(b => b.type === "text")?.text ?? "Sorry, I couldn't generate a response.";
      setMessages([...next, { role: "assistant", content: reply }]);
    } catch (err) {
      setMessages([...next, { role: "assistant", content: `Error: ${err instanceof Error ? err.message : "Something went wrong."}` }]);
    } finally { setChatLoading(false); }
  }

  /* KPI cards — Outstanding card is clickable */
  const kpis = [
    {
      label: "Monthly Revenue", value: dataLoading ? "—" : fmt$(revenue),
      sub: data ? `${data.jobCount} of ${data.totalJobItems} Jobs · Avg ${fmt$(data.avgJobValue)}` : "Loading…",
      color: "#3db54a", positive: true as boolean | null, onClick: undefined as (() => void) | undefined,
    },
    {
      label: "Total Expenses", value: dataLoading ? "—" : fmt$(totalExp),
      sub: `Payroll ${fmt$(payroll)} + QB Est. ${fmt$(QB_EXPENSES.total)}`,
      color: "#ef4444", positive: false as boolean | null, onClick: undefined,
    },
    {
      label: "Net Profit", value: dataLoading ? "—" : fmt$(netProfit),
      sub: dataLoading ? "Loading…" : `${margin}% Margin · ${data?.month ?? "May 2026"}`,
      color: "#2b4fac", positive: true as boolean | null, onClick: undefined,
    },
    {
      label: "Outstanding", value: dataLoading ? "—" : fmt$(outstanding),
      sub: dataLoading ? "Loading…" : `${(data?.outstandingInvoices ?? []).length} Unpaid Invoices · Click to View`,
      color: "#d97706", positive: null as boolean | null,
      onClick: data && (data.outstandingInvoices ?? []).length > 0 ? () => setShowOutstanding(true) : undefined,
    },
  ];

  /* Quick action messages */
  const QUICK_ACTIONS: { label: string; message: string }[] = [
    {
      label: "Monthly check-in",
      message: data
        ? `Give me a complete financial check-in for ${data.month} using our real data: ${fmt$(revenue)} revenue, ${fmt$(totalExp)} expenses, ${fmt$(netProfit)} net profit at ${margin}% margin. ${data.revenueByCategory[0] ? `${data.revenueByCategory[0].label} is our top service at ${fmt$(data.revenueByCategory[0].amount)}.` : ""} What's working, what should I watch, and what should I do before month end?`
        : "Give me a complete financial check-in for May 2026 using our real data: $32,913 revenue, $11,340 expenses, $21,573 net profit at 66% margin. Air Duct is our top service at $11,924. What's working, what should I watch, and what should I do before month end?",
    },
    { label: "Expense check",   message: "Expense check" },
    { label: "What to watch",   message: "What to watch" },
    { label: "Benchmark me",    message: "Benchmark me" },
    { label: "Revenue pace",    message: "Revenue pace" },
  ];

  return (
    <>
      {showOutstanding && data && (
        <OutstandingModal
          invoices={data.outstandingInvoices ?? []}
          total={outstanding}
          onClose={() => setShowOutstanding(false)}
        />
      )}

      <div className="flex flex-col gap-4 h-[calc(100vh-108px)]">

        {/* ── Page header with Last synced ── */}
        <div className="flex items-center justify-end flex-shrink-0 -mb-2">
          {dataLoading ? (
            <span className="text-xs" style={{ color: "#94a3b8" }}>Syncing HouseCall Pro…</span>
          ) : data ? (
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: "#94a3b8" }}>Last synced {fmtTime(data.syncedAt)} CT</span>
              <button
                onClick={loadData}
                className="text-xs flex items-center gap-1 px-2 py-1 rounded-md transition-colors hover:opacity-80"
                style={{ border: "1px solid #e4e8f0", color: "#6b7a90", backgroundColor: "#fff" }}
              >
                <RefreshCw className="w-3 h-3" /> Sync
              </button>
            </div>
          ) : null}
        </div>

        {/* ── KPI row ── */}
        <div className="grid grid-cols-4 gap-4 flex-shrink-0">
          {kpis.map((k) => (
            <div
              key={k.label}
              className={`bg-white rounded-lg px-4 py-3.5 ${k.onClick ? "cursor-pointer transition-shadow hover:shadow-md" : ""}`}
              style={{ border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", borderTop: `2px solid ${k.color}` }}
              onClick={k.onClick}
            >
              <p className="text-xs font-medium uppercase mb-1" style={{ color: "#6b7a90", letterSpacing: "0.6px" }}>{k.label}</p>
              <p className="text-2xl font-bold tracking-tight mb-0.5" style={{ color: "#1a2333" }}>{k.value}</p>
              <p className="text-xs font-medium leading-tight" style={{ color: "#64748b" }}>{k.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Two-column layout ── */}
        <div className="flex gap-4 flex-1 min-h-0">

          {/* Left — Finn chat */}
          <div
            className="flex-1 bg-white rounded-lg flex flex-col min-h-0 min-w-0"
            style={{ border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
          >
            {/* Finn header */}
            <div className="flex items-center gap-3 px-5 py-3.5 flex-shrink-0" style={{ borderBottom: "1px solid #f0f0f0" }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-bold" style={{ background: "linear-gradient(135deg, #3db54a, #2b9e38)" }}>F</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold" style={{ color: "#1a2333" }}>Finn</p>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: data ? "#dcfce7" : "#fef9c3", color: data ? "#15803d" : "#92400e" }}>
                    {data ? "Live Data" : "Loading…"}
                  </span>
                </div>
                <p className="text-xs" style={{ color: "#6b7a90" }}>AI Financial Advisor · HouseCall Pro</p>
              </div>
            </div>

            {/* Quick actions */}
            <div className="px-5 py-2.5 flex gap-2 flex-wrap flex-shrink-0" style={{ borderBottom: "1px solid #f5f5f5" }}>
              {QUICK_ACTIONS.map(q => (
                <button
                  key={q.label}
                  onClick={() => sendMessage(q.message)}
                  disabled={chatLoading}
                  className="text-xs font-medium px-3 py-1.5 rounded-full transition-colors disabled:opacity-50"
                  style={{ border: "1px solid #bbf7d0", color: "#16a34a", backgroundColor: "#dcfce7" }}
                  data-testid={`quick-action-${q.label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  {q.label}
                </button>
              ))}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0">
              {messages.map((msg, i) => (
                <div key={i} className={`flex items-start gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-white text-xs font-bold"
                    style={{ background: msg.role === "assistant" ? "linear-gradient(135deg, #3db54a, #2b9e38)" : "#f0f2f5" }}
                  >
                    {msg.role === "assistant" ? "F" : <span style={{ color: "#6b7a90" }}>U</span>}
                  </div>
                  <div
                    className="max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed"
                    style={msg.role === "assistant"
                      ? { backgroundColor: "#f0fdf4", color: "#1a2333", borderBottomLeftRadius: "4px" }
                      : { backgroundColor: "#2b4fac", color: "#fff", borderBottomRightRadius: "4px" }}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold" style={{ background: "linear-gradient(135deg, #3db54a, #2b9e38)" }}>F</div>
                  <div className="rounded-2xl px-4 py-3 flex gap-1.5 items-center" style={{ backgroundColor: "#f0fdf4", borderBottomLeftRadius: "4px" }}>
                    {[0, 1, 2].map(i => <span key={i} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: "#3db54a", animationDelay: `${i * 0.15}s` }} />)}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <form
              onSubmit={e => { e.preventDefault(); sendMessage(input); }}
              className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
              style={{ borderTop: "1px solid #f0f0f0" }}
            >
              <input
                type="text" value={input} onChange={e => setInput(e.target.value)}
                placeholder="Ask Finn about your finances…"
                disabled={chatLoading}
                className="flex-1 text-sm px-4 py-2.5 rounded-full outline-none disabled:opacity-60"
                style={{ border: "1px solid #e4e8f0", backgroundColor: "#f9fafb", color: "#1a2333" }}
                data-testid="input-finn-chat"
              />
              <button
                type="submit" disabled={chatLoading || !input.trim()}
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
            <div className="bg-white rounded-lg overflow-hidden flex-shrink-0" style={{ border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <div className="px-4 py-3.5" style={{ borderBottom: "1px solid #f0f0f0" }}>
                <p className="text-xs font-semibold uppercase" style={{ color: "#6b7a90", letterSpacing: "0.6px" }}>
                  P&amp;L Summary · {data?.month ?? "May 2026"}
                </p>
              </div>
              <div className="px-4 py-3 space-y-1.5">
                {dataLoading ? (
                  [1, 2, 3].map(i => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="h-3 rounded w-24 animate-pulse" style={{ backgroundColor: "#f0f0f0" }} />
                      <div className="h-3 rounded w-12 animate-pulse" style={{ backgroundColor: "#f0f0f0" }} />
                    </div>
                  ))
                ) : (
                  (data?.revenueByCategory ?? []).map(row => (
                    <div key={row.label} className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: "#6b7a90" }}>{row.label}</span>
                      <span className="text-xs font-semibold" style={{ color: "#3db54a" }}>+{fmt$(row.amount)}</span>
                    </div>
                  ))
                )}
              </div>
              <div className="mx-4 border-t border-dashed border-gray-200 my-0.5" />
              <div className="px-4 py-2 flex items-center justify-between">
                <span className="text-xs font-bold" style={{ color: "#1a2333" }}>Total Revenue</span>
                <span className="text-xs font-bold" style={{ color: "#3db54a" }}>{dataLoading ? "—" : `+${fmt$(revenue)}`}</span>
              </div>
              <div className="px-4 pb-2 pt-1 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: "#6b7a90" }}>Tech Payroll</span>
                  <span className="text-xs font-semibold" style={{ color: "#ef4444" }}>{dataLoading ? "—" : `-${fmt$(payroll)}`}</span>
                </div>
                {QB_EXPENSES.rows.map(row => (
                  <div key={row.label} className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: "#6b7a90" }}>{row.label}</span>
                    <span className="text-xs font-semibold" style={{ color: "#ef4444" }}>-{fmt$(row.value)}</span>
                  </div>
                ))}
              </div>
              <div className="mx-4 border-t border-dashed border-gray-200 my-0.5" />
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-sm font-bold" style={{ color: "#1a2333" }}>Net Profit</span>
                <span className="text-sm font-bold" style={{ color: "#2b4fac" }}>{dataLoading ? "—" : `+${fmt$(netProfit)}`}</span>
              </div>
            </div>

            {/* Technician Pay */}
            <div className="bg-white rounded-lg overflow-hidden flex-shrink-0" style={{ border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <div className="px-4 py-3.5 flex items-center justify-between" style={{ borderBottom: "1px solid #f0f0f0" }}>
                <p className="text-xs font-semibold uppercase" style={{ color: "#6b7a90", letterSpacing: "0.6px" }}>Technician Pay</p>
                <span className="text-[10px]" style={{ color: "#94a3b8" }}>$40/job</span>
              </div>
              <div className="px-4 py-3 space-y-3">
                {dataLoading ? (
                  [1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full animate-pulse" style={{ backgroundColor: "#f0f0f0" }} />
                      <div className="flex-1 space-y-1">
                        <div className="h-3 rounded w-20 animate-pulse" style={{ backgroundColor: "#f0f0f0" }} />
                        <div className="h-2 rounded w-12 animate-pulse" style={{ backgroundColor: "#f0f0f0" }} />
                      </div>
                      <div className="h-4 rounded w-12 animate-pulse" style={{ backgroundColor: "#f0f0f0" }} />
                    </div>
                  ))
                ) : (
                  (data?.techs ?? []).map(tech => (
                    <div key={tech.name} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: tech.color }}>
                        {tech.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate" style={{ color: "#1a2333" }}>{tech.name}</p>
                        <p className="text-[11px]" style={{ color: "#6b7a90" }}>{tech.jobs} jobs</p>
                      </div>
                      <span className="text-sm font-bold flex-shrink-0" style={{ color: "#1a2333" }}>{fmt$(tech.pay)}</span>
                    </div>
                  ))
                )}
              </div>
              <div className="mx-4 border-t border-gray-100" />
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-xs font-bold" style={{ color: "#1a2333" }}>Total Due</span>
                <span className="text-sm font-bold" style={{ color: "#d97706" }}>{dataLoading ? "—" : fmt$(payroll)}</span>
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
    </>
  );
}
