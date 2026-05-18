import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Bot, 
  Radio, 
  BookOpen, 
  Search, 
  Inbox, 
  MessageSquare, 
  Users, 
  RefreshCw, 
  GitBranch, 
  BadgeDollarSign,
  Settings
} from "lucide-react";

const NAV_ITEMS = [
  {
    title: "OVERVIEW",
    items: [
      { name: "Dashboard", href: "/", icon: LayoutDashboard }
    ]
  },
  {
    title: "AGENTS",
    items: [
      { name: "Ryder", href: "/agents/ryder", icon: Bot },
      { name: "Dispatch", href: "/agents/dispatch", icon: Radio },
      { name: "Ledger", href: "/agents/ledger", icon: BookOpen },
      { name: "Scout", href: "/agents/scout", icon: Search }
    ]
  },
  {
    title: "INBOX",
    items: [
      { name: "Unified Inbox", href: "/inbox", icon: Inbox }
    ]
  },
  {
    title: "INTELLIGENCE",
    items: [
      { name: "Ask", href: "/intelligence/ask", icon: MessageSquare },
      { name: "Customers", href: "/intelligence/customers", icon: Users },
      { name: "Reactivation", href: "/intelligence/reactivation", icon: RefreshCw }
    ]
  },
  {
    title: "OPERATIONS",
    items: [
      { name: "Job Pipeline", href: "/operations/jobs", icon: GitBranch },
      { name: "Team & Pay", href: "/operations/team", icon: BadgeDollarSign }
    ]
  }
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <div
      className="w-[240px] flex-shrink-0 h-screen sticky top-0 flex flex-col"
      style={{ backgroundColor: "#1e2a3a", borderRight: "1px solid rgba(255,255,255,0.06)" }}
    >
      {/* App Logo Area */}
      <div className="flex items-center px-4 h-14 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div
          className="flex items-center justify-center font-bold text-white rounded-md text-xs px-2 py-1 mr-2.5 tracking-wide"
          style={{ backgroundColor: "#2b4fac" }}
        >
          TKD
        </div>
        <span className="text-white text-sm font-semibold tracking-tight">Command Center</span>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-3 no-scrollbar">
        {NAV_ITEMS.map((section, idx) => (
          <div key={idx} className="mb-5 px-3">
            <h3
              className="mb-1.5 px-2 font-semibold uppercase text-[#4a5e7a]"
              style={{ fontSize: "9px", letterSpacing: "1.2px" }}
            >
              {section.title}
            </h3>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = location === item.href;
                const Icon = item.icon;

                return (
                  <li key={item.name}>
                    <Link href={item.href}>
                      <span
                        className="flex items-center w-full px-2 py-2 text-sm rounded-md transition-all cursor-pointer relative group"
                        style={{
                          color: isActive ? "#ffffff" : "rgba(255,255,255,0.6)",
                          backgroundColor: isActive ? "rgba(255,255,255,0.12)" : "transparent",
                        }}
                        data-testid={`nav-item-${item.name.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        {/* Green left border for active item */}
                        {isActive && (
                          <div
                            className="absolute left-0 top-0 bottom-0 rounded-r-sm"
                            style={{ width: "3px", backgroundColor: "#3db54a" }}
                          />
                        )}
                        {/* Hover overlay for inactive items */}
                        {!isActive && (
                          <span
                            className="absolute inset-0 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                            style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
                          />
                        )}
                        <Icon className="mr-3 h-4 w-4 relative z-10 flex-shrink-0" />
                        <span
                          className="relative z-10 group-hover:text-white transition-colors"
                          style={{ color: isActive ? "#ffffff" : undefined }}
                        >
                          {item.name}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* User Profile Area */}
      <div className="p-4 shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex items-center cursor-pointer group">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold mr-3 transition-colors flex-shrink-0"
            style={{ backgroundColor: "rgba(255,255,255,0.12)" }}
          >
            TK
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium truncate" style={{ color: "rgba(255,255,255,0.85)" }}>
              Tulsa Kwik Dry
            </p>
          </div>
          <Settings className="h-4 w-4 transition-colors" style={{ color: "rgba(255,255,255,0.35)" }} />
        </div>
      </div>
    </div>
  );
}
