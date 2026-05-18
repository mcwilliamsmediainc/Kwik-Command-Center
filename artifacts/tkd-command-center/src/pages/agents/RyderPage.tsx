import { useState, useRef, useEffect } from "react";
import { Bot, Send, User } from "lucide-react";

const SYSTEM_PROMPT = `You are Ryder, the AI front-desk assistant for Tulsa Kwik Dry — a professional carpet cleaning and water damage restoration company in Tulsa, Oklahoma. You answer customer questions about pricing, services, dry times, and booking. Be concise, friendly, and helpful. Use real-world carpet cleaning pricing (e.g. sectional: $89–$149, whole-house: pricing per sq ft, minimum charge: $89). Always try to nudge toward booking a job.`;

interface Message {
  role: "user" | "assistant";
  content: string;
}

const QUICK_REPLIES = [
  "Sectional pricing",
  "Service area",
  "Dry time",
  "Air ducts",
  "Min charge",
  "Book",
];

const TODAY_STATS = [
  { label: "Questions Answered", value: "34", color: "#2b4fac" },
  { label: "Bookings Generated", value: "7", color: "#3db54a" },
  { label: "Escalated to Team", value: "3", color: "#f97316" },
  { label: "Avg Response Time", value: "1.2s", color: "#7c3aed" },
  { label: "Hours Saved", value: "2.8 hrs", color: "#3db54a" },
];

const TOP_QUESTIONS = [
  { question: "Sectional pricing", count: 11 },
  { question: "Dry time", count: 8 },
  { question: "Whole house price", count: 6 },
  { question: "Air duct pricing", count: 5 },
  { question: "Pet safe?", count: 4 },
];

const WELCOME: Message = {
  role: "assistant",
  content: "Hi! I'm Ryder, your Tulsa Kwik Dry assistant. I can help with pricing, service area, booking, and more. What can I help you with today?",
};

export function RyderPage() {
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;

    const userMsg: Message = { role: "user", content: text.trim() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: SYSTEM_PROMPT,
          messages: next.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json() as {
        content?: Array<{ type: string; text: string }>;
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      const reply = data.content?.find((b) => b.type === "text")?.text ?? "Sorry, I couldn't generate a response.";
      setMessages([...next, { role: "assistant", content: reply }]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setMessages([
        ...next,
        { role: "assistant", content: `Error: ${message}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleQuickReply(label: string) {
    sendMessage(label);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  return (
    <div className="flex gap-5 h-[calc(100vh-108px)]">
      {/* Chat panel */}
      <div
        className="flex-1 flex flex-col bg-white rounded-lg overflow-hidden min-w-0"
        style={{ border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-5 py-3.5 flex-shrink-0"
          style={{ borderBottom: "1px solid #f0f0f0" }}
        >
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: "#eff4ff" }}
          >
            <Bot className="w-5 h-5" style={{ color: "#2b4fac" }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: "#1a2333" }}>Ryder</p>
            <p className="text-xs" style={{ color: "#3db54a" }}>Active · answering customer questions</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#3db54a" }} />
            <span className="text-xs font-medium" style={{ color: "#6b7a90" }}>Live</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ backgroundColor: msg.role === "assistant" ? "#eff4ff" : "#f0f0f0" }}
              >
                {msg.role === "assistant"
                  ? <Bot className="w-4 h-4" style={{ color: "#2b4fac" }} />
                  : <User className="w-4 h-4" style={{ color: "#6b7a90" }} />
                }
              </div>
              <div
                className="max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed"
                style={
                  msg.role === "assistant"
                    ? { backgroundColor: "#f5f7ff", color: "#1a2333", borderBottomLeftRadius: "4px" }
                    : { backgroundColor: "#2b4fac", color: "#ffffff", borderBottomRightRadius: "4px" }
                }
              >
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-start gap-3">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: "#eff4ff" }}
              >
                <Bot className="w-4 h-4" style={{ color: "#2b4fac" }} />
              </div>
              <div
                className="rounded-2xl px-4 py-3 flex gap-1.5 items-center"
                style={{ backgroundColor: "#f5f7ff", borderBottomLeftRadius: "4px" }}
              >
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full animate-bounce"
                    style={{ backgroundColor: "#2b4fac", animationDelay: `${i * 0.15}s` }}
                  />
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
              onClick={() => handleQuickReply(q)}
              disabled={loading}
              className="text-xs font-medium px-3 py-1.5 rounded-full transition-colors disabled:opacity-50"
              style={{ border: "1px solid #dbe3f8", color: "#2b4fac", backgroundColor: "#f4f6fd" }}
              data-testid={`quick-reply-${q.toLowerCase().replace(/\s+/g, "-")}`}
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input */}
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
          style={{ borderTop: "1px solid #f0f0f0" }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Ryder something..."
            disabled={loading}
            className="flex-1 text-sm px-4 py-2.5 rounded-full outline-none disabled:opacity-60"
            style={{ border: "1px solid #e4e8f0", backgroundColor: "#f9fafb", color: "#1a2333" }}
            data-testid="input-ryder-chat"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-opacity disabled:opacity-40"
            style={{ backgroundColor: "#2b4fac" }}
            data-testid="button-send-message"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </form>
      </div>

      {/* Right panel */}
      <div className="w-[260px] flex-shrink-0 flex flex-col gap-4 overflow-y-auto">
        {/* Today's Stats */}
        <div
          className="bg-white rounded-lg overflow-hidden"
          style={{ border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
        >
          <div className="px-4 py-3.5" style={{ borderBottom: "1px solid #f0f0f0" }}>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#6b7a90", letterSpacing: "0.6px" }}>
              Today's Stats
            </p>
          </div>
          <div className="divide-y divide-gray-50">
            {TODAY_STATS.map((stat) => (
              <div key={stat.label} className="flex items-center justify-between px-4 py-3">
                <span className="text-xs" style={{ color: "#6b7a90" }}>{stat.label}</span>
                <span className="text-sm font-bold" style={{ color: stat.color }}>{stat.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Questions */}
        <div
          className="bg-white rounded-lg overflow-hidden"
          style={{ border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
        >
          <div className="px-4 py-3.5" style={{ borderBottom: "1px solid #f0f0f0" }}>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#6b7a90", letterSpacing: "0.6px" }}>
              Top Questions Today
            </p>
          </div>
          <div className="px-4 py-3 space-y-3">
            {TOP_QUESTIONS.map((item, i) => {
              const pct = Math.round((item.count / TOP_QUESTIONS[0].count) * 100);
              return (
                <div key={item.question}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium" style={{ color: "#1a2333" }}>{item.question}</span>
                    <span className="text-xs font-semibold" style={{ color: "#6b7a90" }}>{item.count}x</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "#f0f2f5" }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: i === 0 ? "#2b4fac" : i === 1 ? "#3db54a" : "#94a3b8",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
