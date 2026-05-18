import { Search, MoreVertical, Paperclip, Send } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const CONVERSATIONS = [
  { id: 1, name: "Sarah Jenkins", preview: "Thanks for the estimate. When can you...", time: "10:42 AM", unread: 2, type: "sms" },
  { id: 2, name: "Oakwood Apartments", preview: "The team just finished unit 4B. Looks...", time: "9:15 AM", unread: 0, type: "email" },
  { id: 3, name: "Michael Chen", preview: "Can we reschedule my appointment for...", time: "Yesterday", unread: 1, type: "sms" },
  { id: 4, name: "City Library", preview: "Invoice #INV-4929 received. Processing...", time: "Yesterday", unread: 0, type: "email" },
  { id: 5, name: "David Ross", preview: "I have a question about the drying process...", time: "Mon", unread: 0, type: "sms" },
  { id: 6, name: "Elena Rodriguez", preview: "Please send the before/after photos...", time: "Oct 12", unread: 0, type: "email" },
];

export function InboxPage() {
  return (
    <div className="h-[calc(100vh-120px)] flex bg-white border border-[rgba(0,0,0,0.07)] rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.08)] overflow-hidden">
      {/* Left Panel - Conversation List */}
      <div className="w-1/3 min-w-[320px] max-w-[400px] border-r border-gray-200 flex flex-col bg-white">
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Search messages..." 
              className="pl-9 bg-gray-50 border-transparent focus-visible:ring-[#2b4fac]"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {CONVERSATIONS.map((conv, idx) => (
            <div 
              key={conv.id} 
              className={`p-4 border-b border-gray-50 cursor-pointer transition-colors ${
                idx === 0 ? "bg-blue-50/50" : "hover:bg-gray-50"
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-semibold text-[#1a2333] text-sm">{conv.name}</span>
                <span className="text-xs text-[#6b7a90] whitespace-nowrap">{conv.time}</span>
              </div>
              <div className="flex justify-between items-center">
                <p className={`text-sm truncate pr-4 ${conv.unread > 0 ? "text-[#1a2333] font-medium" : "text-[#6b7a90]"}`}>
                  {conv.preview}
                </p>
                {conv.unread > 0 && (
                  <Badge className="bg-[#2b4fac] hover:bg-[#2b4fac] text-white px-1.5 min-w-[20px] h-[20px] flex items-center justify-center rounded-full text-[10px]">
                    {conv.unread}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel - Thread */}
      <div className="flex-1 flex flex-col bg-gray-50/30">
        {/* Thread Header */}
        <div className="p-4 border-b border-gray-200 bg-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback className="bg-blue-100 text-[#2b4fac] font-medium">SJ</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-[#1a2333] text-sm">Sarah Jenkins</h3>
              <p className="text-xs text-[#6b7a90]">Job #J-8492 • Water Extraction</p>
            </div>
          </div>
          <button className="text-gray-400 hover:text-gray-600 p-2">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex justify-center">
            <span className="text-xs text-gray-400 font-medium bg-gray-100 px-3 py-1 rounded-full">Today</span>
          </div>

          {/* Outbound Message */}
          <div className="flex flex-col items-end gap-1">
            <div className="bg-[#2b4fac] text-white px-4 py-2 rounded-2xl rounded-tr-sm max-w-[75%] text-sm shadow-sm">
              <p>Hi Sarah, this is Alex from Tulsa Kwik Dry. I've sent over the estimate for the water extraction in the basement. Let me know if you have any questions!</p>
            </div>
            <span className="text-[10px] text-gray-400 mr-1">9:15 AM</span>
          </div>

          {/* Inbound Message */}
          <div className="flex flex-col items-start gap-1">
            <div className="bg-white border border-gray-200 text-[#1a2333] px-4 py-2 rounded-2xl rounded-tl-sm max-w-[75%] text-sm shadow-sm">
              <p>Thanks for the estimate. When can you start the work?</p>
            </div>
            <span className="text-[10px] text-gray-400 ml-1">10:42 AM</span>
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-gray-200 shrink-0">
          <div className="flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-xl p-2 focus-within:ring-1 focus-within:ring-[#2b4fac] focus-within:border-[#2b4fac] transition-all">
            <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
              <Paperclip className="w-5 h-5" />
            </button>
            <textarea 
              className="flex-1 bg-transparent border-none focus:ring-0 resize-none min-h-[40px] max-h-[120px] text-sm py-2 px-2 text-[#1a2333] placeholder:text-gray-400"
              placeholder="Type a message..."
              rows={1}
            ></textarea>
            <button className="p-2 bg-[#2b4fac] hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
