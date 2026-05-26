import { useState, useRef, useEffect, useMemo } from "react";
import { Flame, Send, User, Sparkles } from "lucide-react";
import { useProfile, buildBusinessContext, type BusinessProfile } from "@/context/ProfileContext";

/* ─── System prompt ───────────────────────────────────────────── */
function buildBlazePrompt(p: BusinessProfile): string {
  return `You are Blaze, a social media content specialist for ${p.business_name}. You write engaging, authentic content that sounds like a real local business — not corporate. You know the brand voice: warm, neighborly, professional. Always mention the specific service, the city, and end with a clear call to action. Phone: ${p.phone}. Booking: ${p.booking_url}.

When writing posts, provide:
1. The post text
2. 3-5 relevant hashtags
3. Best time to post
4. One image suggestion

${buildBusinessContext(p)}`;
}

interface Message { role: "user" | "assistant"; content: string }

const QUICK_REPLIES = [
  "Write a Facebook post",
  "Create an Instagram caption",
  "Google Business Post",
  "Before/after story post",
  "Seasonal promotion post",
];

/* ─── Content calendar — seasoned for late spring / early summer ─── */
interface CalendarTopic { title: string; channel: string; angle: string }
const CALENDAR: Array<{ week: string; range: string; topics: CalendarTopic[] }> = [
  {
    week: "This Week",
    range: "May 26 – Jun 1",
    topics: [
      { title: "Post-Memorial Day BBQ carpet stain rescue",  channel: "Facebook",   angle: "Top spring stain tips + same-day booking" },
      { title: "Pollen season air-duct cleaning offer",      channel: "Instagram",  angle: "Allergy relief angle, before/after photo" },
      { title: "Pet-safe dry time vs steam cleaning",        channel: "Google Post", angle: "1-hour dry time, kid + pet friendly" },
    ],
  },
  {
    week: "Next Week",
    range: "Jun 2 – Jun 8",
    topics: [
      { title: "Summer hosting prep: upholstery refresh",    channel: "Facebook",   angle: "Sectional + sofa pricing, book before guests" },
      { title: "Tile & grout deep clean reel",               channel: "Instagram",  angle: "Satisfying transformation video" },
      { title: "Father's Day gift card promo",               channel: "Google Post", angle: "Gift the gift of a clean home" },
    ],
  },
  {
    week: "Week of Jun 9",
    range: "Jun 9 – Jun 15",
    topics: [
      { title: "Customer review spotlight",                  channel: "Facebook",   angle: "Quote a recent 5★ review, tag neighborhood" },
      { title: "Mattress cleaning summer special",           channel: "Instagram",  angle: "Why summer is the right time, hot price" },
      { title: "Dryer vent fire safety reminder",            channel: "Google Post", angle: "Quick stat + book inspection CTA" },
    ],
  },
  {
    week: "Week of Jun 16",
    range: "Jun 16 – Jun 22",
    topics: [
      { title: "Service-area shout-out: Bixby / Jenks",      channel: "Facebook",   angle: "Local-first angle, neighborhood photos" },
      { title: "Wood floor refresh how-to",                  channel: "Instagram",  angle: "$1.50/sq ft promo with carousel" },
      { title: "Mid-summer carpet maintenance tips",         channel: "Google Post", angle: "3 quick tips + book annual deep clean" },
    ],
  },
];

export function BlazePage() {
  const profile = useProfile();
  const SYSTEM_PROMPT = useMemo(() => buildBlazePrompt(profile), [profile]);
  const WELCOME: Message = useMemo(() => ({
    role: "assistant",
    content: `Hey! I'm Blaze, your social content sidekick for ${profile.business_short_name}. I write posts that sound like a real neighbor — not a billboard. Pick a quick action below or describe the post you need.`,
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

  function generatePostFor(topic: CalendarTopic) {
    sendMessage(`Write a ${topic.channel} post about "${topic.title}". Angle: ${topic.angle}.`);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ── Header ── */}
      <div className="bg-white rounded-lg px-5 py-4 flex items-center gap-4" style={{ border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#fff7ed" }}>
          <Flame className="w-5 h-5" style={{ color: "#ea580c" }} />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold" style={{ color: "#1a2333" }}>Blaze — Social Content Agent</h1>
          <p className="text-xs" style={{ color: "#6b7a90" }}>Facebook · Instagram · Google Posts · Content Calendar</p>
        </div>
        <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: "#ffedd5", color: "#c2410c", border: "1px solid #fed7aa" }}>
          ● Active
        </span>
      </div>

      <div className="flex flex-col md:flex-row gap-5 md:h-[calc(100vh-188px)]">
        {/* ── Chat ── */}
        <div className="flex-1 flex flex-col bg-white rounded-lg overflow-hidden min-w-0" style={{ border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div className="overflow-y-auto px-5 py-4 space-y-4 min-h-[300px] max-h-[50vh] md:flex-1 md:max-h-none">
            {messages.map((msg, i) => (
              <div key={i} className={`flex items-start gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: msg.role === "assistant" ? "#fff7ed" : "#f0f0f0" }}>
                  {msg.role === "assistant"
                    ? <Flame className="w-4 h-4" style={{ color: "#ea580c" }} />
                    : <User  className="w-4 h-4" style={{ color: "#6b7a90" }} />}
                </div>
                <div
                  className="max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap"
                  style={msg.role === "assistant"
                    ? { backgroundColor: "#fff7ed", color: "#1a2333", borderBottomLeftRadius: "4px" }
                    : { backgroundColor: "#ea580c", color: "#ffffff", borderBottomRightRadius: "4px" }}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#fff7ed" }}>
                  <Flame className="w-4 h-4" style={{ color: "#ea580c" }} />
                </div>
                <div className="rounded-2xl px-4 py-3 flex gap-1.5 items-center" style={{ backgroundColor: "#fff7ed", borderBottomLeftRadius: "4px" }}>
                  {[0,1,2].map(i => (
                    <span key={i} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: "#ea580c", animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="px-5 py-2.5 flex gap-2 flex-wrap flex-shrink-0" style={{ borderTop: "1px solid #f5f5f5" }}>
            {QUICK_REPLIES.map((q) => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                disabled={loading}
                className="text-xs font-medium px-3 py-1.5 rounded-full transition-colors disabled:opacity-50"
                style={{ border: "1px solid #fed7aa", color: "#c2410c", backgroundColor: "#fff7ed" }}
                data-testid={`blaze-quick-${q.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
              >
                {q}
              </button>
            ))}
          </div>

          <form onSubmit={(e) => { e.preventDefault(); sendMessage(input); }} className="flex items-center gap-3 px-4 py-3 flex-shrink-0" style={{ borderTop: "1px solid #f0f0f0" }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tell Blaze what to write…"
              disabled={loading}
              className="flex-1 text-sm px-4 rounded-full outline-none disabled:opacity-60 min-h-[44px]"
              style={{ border: "1px solid #e4e8f0", backgroundColor: "#f9fafb", color: "#1a2333" }}
              data-testid="input-blaze-chat"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 transition-opacity disabled:opacity-40"
              style={{ backgroundColor: "#ea580c" }}
              data-testid="button-blaze-send"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </form>
        </div>

        {/* ── Content Calendar ── */}
        <div className="w-full md:w-[320px] flex-shrink-0 flex flex-col gap-3 overflow-y-auto">
          <div className="px-1">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#6b7a90", letterSpacing: "0.6px" }}>
              Content Calendar
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: "#94a3b8" }}>4-week plan · seasonal &amp; service-driven</p>
          </div>

          {CALENDAR.map((week, wi) => (
            <div key={week.week} className="bg-white rounded-lg overflow-hidden" style={{ border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <div className="px-4 py-2.5 flex items-center justify-between" style={{ borderBottom: "1px solid #f0f0f0", backgroundColor: wi === 0 ? "#fff7ed" : "#fafafa" }}>
                <p className="text-xs font-bold" style={{ color: "#1a2333" }}>{week.week}</p>
                <p className="text-[10px] font-medium" style={{ color: "#6b7a90" }}>{week.range}</p>
              </div>
              <div className="divide-y divide-gray-50">
                {week.topics.map((t, ti) => (
                  <div key={ti} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-xs font-semibold leading-snug" style={{ color: "#1a2333" }}>{t.title}</p>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: "#fff7ed", color: "#c2410c", border: "1px solid #fed7aa" }}>
                        {t.channel}
                      </span>
                    </div>
                    <p className="text-[11px] mb-2" style={{ color: "#6b7a90" }}>{t.angle}</p>
                    <button
                      onClick={() => generatePostFor(t)}
                      disabled={loading}
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-md flex items-center gap-1 hover:opacity-80 disabled:opacity-50 transition-opacity"
                      style={{ backgroundColor: "#fff7ed", color: "#c2410c", border: "1px solid #fed7aa" }}
                      data-testid={`button-generate-post-${wi}-${ti}`}
                    >
                      <Sparkles className="w-3 h-3" /> Generate Post
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
