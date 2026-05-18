import { MessageSquare, Sparkles, Send } from "lucide-react";
import { Card } from "@/components/ui/card";

export function AskPage() {
  return (
    <div className="h-[calc(100vh-120px)] flex flex-col max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1a2333]">Ask TKD Intelligence</h1>
        <p className="text-[#6b7a90] text-sm mt-1">Query your business data using natural language</p>
      </div>

      <Card className="flex-1 flex flex-col bg-white border-[rgba(0,0,0,0.07)] shadow-[0_1px_4px_rgba(0,0,0,0.08)] overflow-hidden">
        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex justify-center mb-8">
            <div className="bg-blue-50 text-[#2b4fac] px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 border border-blue-100">
              <Sparkles className="w-4 h-4" />
              Intelligence Engine Active
            </div>
          </div>

          {/* User Query */}
          <div className="flex gap-4 max-w-[80%] ml-auto">
            <div className="bg-gray-100 text-[#1a2333] px-5 py-3 rounded-2xl rounded-tr-sm text-sm">
              <p>What's our revenue for water damage jobs this month compared to last month?</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <span className="text-xs font-semibold text-[#2b4fac]">AD</span>
            </div>
          </div>

          {/* AI Response */}
          <div className="flex gap-4 max-w-[85%]">
            <div className="w-8 h-8 rounded-full bg-[#2b4fac] flex items-center justify-center shrink-0 text-white">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div className="bg-white border border-gray-200 text-[#1a2333] px-5 py-4 rounded-2xl rounded-tl-sm text-sm shadow-sm space-y-3">
              <p>Month-to-date revenue for <strong>Water Damage</strong> services is <strong>$32,450</strong>.</p>
              <p>This is a <strong>14% increase</strong> compared to the same period last month ($28,460).</p>
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 mt-2">
                <div className="flex justify-between items-center text-xs text-gray-500 mb-1">
                  <span>Category Breakdown</span>
                  <span>MTD</span>
                </div>
                <div className="space-y-2 mt-2">
                  <div className="flex justify-between text-sm">
                    <span>Water Extraction</span>
                    <span className="font-medium">$18,200</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Mold Remediation</span>
                    <span className="font-medium">$9,800</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Structural Drying</span>
                    <span className="font-medium">$4,450</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/50">
          <div className="relative max-w-3xl mx-auto">
            <input 
              type="text" 
              placeholder="Ask about revenue, jobs, team performance..." 
              className="w-full pl-4 pr-12 py-3 rounded-xl border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2b4fac] focus:border-transparent text-sm"
            />
            <button className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-[#2b4fac] text-white rounded-lg flex items-center justify-center hover:bg-blue-700 transition-colors shadow-sm">
              <Send className="w-4 h-4" />
            </button>
          </div>
          <div className="flex justify-center gap-3 mt-3">
            <button className="text-[11px] text-[#6b7a90] hover:text-[#2b4fac] bg-white border border-gray-200 px-3 py-1 rounded-full shadow-sm">{"Show pending invoices > $1k"}</button>
            <button className="text-[11px] text-[#6b7a90] hover:text-[#2b4fac] bg-white border border-gray-200 px-3 py-1 rounded-full shadow-sm">"Who are our top 5 clients?"</button>
            <button className="text-[11px] text-[#6b7a90] hover:text-[#2b4fac] bg-white border border-gray-200 px-3 py-1 rounded-full shadow-sm">"Average job completion time"</button>
          </div>
        </div>
      </Card>
    </div>
  );
}
