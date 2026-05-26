import { Bell, Search, Menu } from "lucide-react";
import { useLocation } from "wouter";
import { useProfile } from "@/context/ProfileContext";

const STATIC_PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/inbox": "Unified Inbox",
  "/intelligence/customers": "Customers",
  "/intelligence/reactivation": "Reactivation",
  "/operations/jobs": "Job Pipeline",
  "/operations/team": "Team & Pay",
  "/settings": "Settings",
  "/agents/sage":  "Sage",
  "/agents/blaze": "Blaze",
};

interface TopBarProps {
  onMenuClick: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const [location] = useLocation();
  const profile = useProfile();
  const agentTitles: Record<string, string> = {
    "/agents/ryder":     profile.agents.customer_faq,
    "/agents/dispatch":  profile.agents.dispatch,
    "/agents/ledger":    profile.agents.financial,
    "/agents/scout":     profile.agents.marketing,
    "/intelligence/ask": profile.agents.orchestrator,
  };
  const title = STATIC_PAGE_TITLES[location] || agentTitles[location] || profile.app_name;

  return (
    <div
      className="h-[56px] bg-white border-b border-[#e8eaed] flex items-center justify-between px-4 md:px-6 shrink-0 sticky top-0 z-10"
      style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}
    >
      <div className="flex items-center gap-3">
        {/* Hamburger — visible on mobile only */}
        <button
          className="md:hidden flex items-center justify-center w-9 h-9 rounded-md text-[#6b7a90] hover:text-[#1a2333] hover:bg-gray-100 transition-colors"
          onClick={onMenuClick}
          aria-label="Open menu"
          data-testid="button-hamburger-menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex flex-col leading-tight min-w-0">
          <h1 className="font-semibold text-lg truncate" style={{ color: "#1a2333" }}>{title}</h1>
          <span className="text-[10px] uppercase tracking-wider truncate hidden sm:block" style={{ color: "#94a3b8", letterSpacing: "0.8px" }}>
            {profile.business_name}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-4">
        <button className="text-[#6b7a90] hover:text-[#1a2333] transition-colors p-1.5 rounded-md hover:bg-gray-100">
          <Search className="w-5 h-5" />
        </button>
        <button className="text-[#6b7a90] hover:text-[#1a2333] transition-colors p-1.5 rounded-md hover:bg-gray-100 relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#3db54a] rounded-full border border-white"></span>
        </button>

        <div className="h-6 w-[1px] bg-gray-200 mx-0.5 hidden sm:block"></div>

        <button
          className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 font-medium text-sm border border-blue-100 hover:bg-blue-100 transition-colors"
          style={{ color: profile.primary_color }}
        >
          {profile.business_short_name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
        </button>
      </div>
    </div>
  );
}
