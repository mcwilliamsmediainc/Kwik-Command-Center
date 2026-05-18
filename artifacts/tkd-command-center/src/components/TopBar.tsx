import { Bell, Search } from "lucide-react";
import { useLocation } from "wouter";

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/agents/ryder": "Ryder Agent",
  "/agents/dispatch": "Dispatch Agent",
  "/agents/ledger": "Ledger Agent",
  "/agents/scout": "Scout Agent",
  "/inbox": "Unified Inbox",
  "/intelligence/ask": "Ask TKD",
  "/intelligence/customers": "Customers",
  "/intelligence/reactivation": "Reactivation",
  "/operations/jobs": "Job Pipeline",
  "/operations/team": "Team & Pay"
};

export function TopBar() {
  const [location] = useLocation();
  const title = PAGE_TITLES[location] || "Command Center";

  return (
    <div 
      className="h-[56px] bg-white border-b border-[#e8eaed] flex items-center justify-between px-6 shrink-0 sticky top-0 z-10"
      style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}
    >
      <div>
        <h1 className="text-[1a2333] font-semibold text-lg">{title}</h1>
      </div>
      
      <div className="flex items-center gap-4">
        <button className="text-[#6b7a90] hover:text-[#1a2333] transition-colors p-1.5 rounded-md hover:bg-gray-100">
          <Search className="w-5 h-5" />
        </button>
        <button className="text-[#6b7a90] hover:text-[#1a2333] transition-colors p-1.5 rounded-md hover:bg-gray-100 relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#3db54a] rounded-full border border-white"></span>
        </button>
        
        <div className="h-6 w-[1px] bg-gray-200 mx-1"></div>
        
        <button className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-[#2b4fac] font-medium text-sm border border-blue-100 hover:bg-blue-100 transition-colors">
          AD
        </button>
      </div>
    </div>
  );
}
