import { useState, useRef, useEffect, useMemo } from "react";
import { Search, Send, User, Star, CheckSquare, Square, ExternalLink } from "lucide-react";
import { useProfile, buildBusinessContext, type BusinessProfile } from "@/context/ProfileContext";

/* ─── System prompt ───────────────────────────────────────────── */
function buildSagePrompt(p: BusinessProfile, rating: number | null, reviewCount: number | null): string {
  const city = p.address.split(",")[1]?.trim() || p.service_area[0] || "your area";
  const ratingStr = rating !== null ? `${rating.toFixed(1)}` : "unknown";
  const reviewStr = reviewCount !== null ? reviewCount.toLocaleString() : "an unknown number of";

  return `You are Sage, an expert local SEO strategist for ${p.business_name} in ${city}. You specialize in Google Business Profile optimization, Map Pack rankings, and local search visibility for home service businesses. You give specific, actionable advice — not generic tips. You know that ${p.business_name} serves ${p.service_area.join(", ")} and their top services include ${p.services.filter(s => s.active).slice(0, 5).map(s => s.name).join(", ")}. Current Google rating: ${ratingStr} with ${reviewStr} reviews. Always end with one specific next action the owner can take today.

${buildBusinessContext(p)}`;
}

interface Message { role: "user" | "assistant"; content: string }

const QUICK_REPLIES = [
  "Check my GBP health",
  "Map Pack ranking tips",
  "Content ideas this week",
  "Competitor analysis",
  "What to post today",
];

interface ReviewsData { rating: number; totalReviews: number; placeId: string }
interface LeadSource  { label: string; jobs: number; pct: number }
interface LeadSourcesData { sources: LeadSource[]; month: string }

const GBP_CHECKLIST: Array<{ label: string; done: boolean }> = [
  { label: "Business name consistent",     done: true  },
  { label: "Phone number verified",        done: true  },
  { label: "Hours up to date",             done: true  },
  { label: "Photos added this month",      done: true  },
  { label: "Weekly post published",        done: false },
  { label: "Q&A section populated",        done: false },
  { label: "Services list complete",       done: false },
  { label: "Booking link added",           done: false },
];

export function SagePage() {
  const profile = useProfile();

  const [reviewsData,   setReviewsData]    = useState<ReviewsData | null>(null);
  const [reviewsErr,    setReviewsErr]     = useState<string | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  const [sourcesData,   setSourcesData]    = useState<LeadSourcesData | null>(null);
  const [sourcesErr,    setSourcesErr]     = useState<string | null>(null);
  const [sourcesLoading, setSourcesLoading] = useState(true);

  useEffect(() => {
    fetch("/api/scout/reviews")
      .then(async r => {
        const d = await r.json() as ReviewsData & { error?: string };
        if (!r.ok || d.error) throw new Error(d.error ?? `HTTP ${r.status}`);
        setReviewsData(d);
      })
      .catch(e => setReviewsErr(e instanceof Error ? e.message : String(e)))
      .finally(() => setReviewsLoading(false));

    fetch("/api/scout/leadsources")
      .then(async r => {
        const d = await r.json() as LeadSourcesData & { error?: string };
        if (!r.ok || d.error) throw new Error(d.error ?? `HTTP ${r.status}`);
        setSourcesData(d);
      })
      .catch(e => setSourcesErr(e instanceof Error ? e.message : String(e)))
      .finally(() => setSourcesLoading(false));
  }, []);

  const rating       = reviewsData?.rating ?? null;
  const totalReviews = reviewsData?.totalReviews ?? null;
  const topSource    = useMemo(() => {
    const ranked = [...(sourcesData?.sources ?? [])].sort((a, b) => b.jobs - a.jobs);
    return ranked.find(s => s.label !== "Unknown") ?? ranked[0] ?? null;
  }, [sourcesData]);

  const SYSTEM_PROMPT = useMemo(
    () => buildSagePrompt(profile, rating, totalReviews),
    [profile, rating, totalReviews],
  );
  const WELCOME: Message = useMemo(() => ({
    role: "assistant",
    content: `Hi! I'm Sage, your local SEO strategist for ${profile.business_short_name}. I help with Google Business Profile, Map Pack rankings, and content that pulls in local search. Pick a quick action below, or ask me anything.`,
  }), [profile.business_short_name]);

  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages((prev) => (prev.length === 1 && prev[0].role === "assistant" ? [WELCOME] : prev));
  }, [WELCOME]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;
    const next: Message[] = [...messages, { role: "user", content: text.trim() }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system: SYSTEM_PROMPT, messages: next.map(m => ({ role: m.role, content: m.content })) }),
      });
      const data = await res.json() as { content?: Array<{ type: string; text: string }>; error?: string };
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      const reply = data.content?.find(b => b.type === "text")?.text ?? "Sorry, I couldn't generate a response.";
      setMessages([...next, { role: "assistant", content: reply }]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setMessages([...next, { role: "assistant", content: `Error: ${message}` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ── Header ── */}
      <div className="bg-white rounded-lg px-5 py-4 flex items-center gap-4" style={{ border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#ecfdf5" }}>
          <Search className="w-5 h-5" style={{ color: "#15803d" }} />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold" style={{ color: "#1a2333" }}>Sage — Local SEO Agent</h1>
          <p className="text-xs" style={{ color: "#6b7a90" }}>Google Business Profile · Map Pack · Local Rankings</p>
        </div>
        <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: "#dcfce7", color: "#15803d", border: "1px solid #bbf7d0" }}>
          ● Active
        </span>
      </div>

      <div className="flex flex-col md:flex-row gap-5 md:h-[calc(100vh-188px)]">
        {/* ── Chat ── */}
        <div className="flex-1 flex flex-col bg-white rounded-lg overflow-hidden min-w-0" style={{ border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div className="overflow-y-auto px-5 py-4 space-y-4 min-h-[300px] max-h-[50vh] md:flex-1 md:max-h-none">
            {messages.map((msg, i) => (
              <div key={i} className={`flex items-start gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: msg.role === "assistant" ? "#ecfdf5" : "#f0f0f0" }}>
                  {msg.role === "assistant"
                    ? <Search className="w-4 h-4" style={{ color: "#15803d" }} />
                    : <User   className="w-4 h-4" style={{ color: "#6b7a90" }} />}
                </div>
                <div
                  className="max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap"
                  style={msg.role === "assistant"
                    ? { backgroundColor: "#f0fdf4", color: "#1a2333", borderBottomLeftRadius: "4px" }
                    : { backgroundColor: "#15803d", color: "#ffffff", borderBottomRightRadius: "4px" }}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#ecfdf5" }}>
                  <Search className="w-4 h-4" style={{ color: "#15803d" }} />
                </div>
                <div className="rounded-2xl px-4 py-3 flex gap-1.5 items-center" style={{ backgroundColor: "#f0fdf4", borderBottomLeftRadius: "4px" }}>
                  {[0,1,2].map(i => (
                    <span key={i} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: "#15803d", animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick replies */}
          <div className="px-5 py-2.5 flex gap-2 flex-wrap flex-shrink-0" style={{ borderTop: "1px solid #f5f5f5" }}>
            {QUICK_REPLIES.map((q) => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                disabled={loading}
                className="text-xs font-medium px-3 py-1.5 rounded-full transition-colors disabled:opacity-50"
                style={{ border: "1px solid #bbf7d0", color: "#15803d", backgroundColor: "#f0fdf4" }}
                data-testid={`sage-quick-${q.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input */}
          <form onSubmit={(e) => { e.preventDefault(); sendMessage(input); }} className="flex items-center gap-3 px-4 py-3 flex-shrink-0" style={{ borderTop: "1px solid #f0f0f0" }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Sage about local SEO…"
              disabled={loading}
              className="flex-1 text-sm px-4 rounded-full outline-none disabled:opacity-60 min-h-[44px]"
              style={{ border: "1px solid #e4e8f0", backgroundColor: "#f9fafb", color: "#1a2333" }}
              data-testid="input-sage-chat"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 transition-opacity disabled:opacity-40"
              style={{ backgroundColor: "#15803d" }}
              data-testid="button-sage-send"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </form>
        </div>

        {/* ── Right column ── */}
        <div className="w-full md:w-[280px] flex-shrink-0 flex flex-col gap-3 overflow-y-auto">
          <StatCard
            label="Google Rating"
            value={reviewsLoading ? "…" : rating !== null ? `${rating.toFixed(1)}★` : "N/A"}
            sub={
              reviewsLoading ? "loading…"
              : totalReviews !== null ? `${totalReviews.toLocaleString()} reviews`
              : reviewsErr ?? "unavailable"
            }
            icon={<Star className="w-4 h-4" style={{ color: "#eab308", fill: "#eab308" }} />}
            accent="#eab308"
          />
          <StatCard
            label="Review Count"
            value={reviewsLoading ? "…" : totalReviews !== null ? totalReviews.toLocaleString() : "N/A"}
            sub={reviewsLoading ? "loading…" : reviewsErr ? "unavailable" : "Google Business Profile"}
            accent="#2b4fac"
          />
          <StatCard
            label="Top Lead Source"
            value={sourcesLoading ? "…" : topSource?.label ?? "N/A"}
            sub={
              sourcesLoading ? "loading…"
              : topSource ? `${topSource.jobs} jobs · ${topSource.pct}%`
              : sourcesErr ?? "no data yet"
            }
            accent="#15803d"
          />

          {/* GBP Checklist */}
          <div className="bg-white rounded-lg overflow-hidden" style={{ border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid #f0f0f0" }}>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#6b7a90", letterSpacing: "0.6px" }}>
                GBP Checklist
              </p>
              <a
                href="https://business.google.com/dashboard"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-medium flex items-center gap-1 hover:underline"
                style={{ color: "#15803d" }}
              >
                Open <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <ul className="px-4 py-3 space-y-2">
              {GBP_CHECKLIST.map((item) => (
                <li key={item.label} className="flex items-center gap-2 text-xs" style={{ color: item.done ? "#1a2333" : "#6b7a90" }}>
                  {item.done
                    ? <CheckSquare className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#15803d" }} />
                    : <Square      className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#cbd5e1" }} />}
                  <span className={item.done ? "" : "italic"}>{item.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Small reusable stat card ─── */
function StatCard({
  label, value, sub, accent, icon,
}: { label: string; value: string; sub: string; accent: string; icon?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg px-4 py-3" style={{ border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", borderTop: `2px solid ${accent}` }}>
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#6b7a90", letterSpacing: "0.6px" }}>{label}</p>
        {icon}
      </div>
      <p className="text-2xl font-bold tracking-tight" style={{ color: "#1a2333" }}>{value}</p>
      <p className="text-[11px] mt-0.5" style={{ color: "#64748b" }}>{sub}</p>
    </div>
  );
}
