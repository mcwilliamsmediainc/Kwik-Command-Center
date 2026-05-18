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
import { cn } from "@/lib/utils";

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
      className="w-[240px] flex-shrink-0 h-screen sticky top-0 flex flex-col border-r border-sidebar-border"
      style={{ backgroundColor: "#1e2a3a" }}
    >
      {/* App Logo Area */}
      <div className="flex items-center px-4 h-16 border-b border-white/10 shrink-0">
        <div 
          className="flex items-center justify-center font-bold text-white rounded-md text-xs px-2 py-1 mr-2"
          style={{ backgroundColor: "#2b4fac" }}
        >
          TKD
        </div>
        <span className="text-white text-sm font-medium tracking-tight">Command Center</span>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4 no-scrollbar">
        {NAV_ITEMS.map((section, idx) => (
          <div key={idx} className="mb-6 px-3">
            <h3 className="mb-2 px-2 text-[10px] font-semibold text-[#4a5e7a] uppercase tracking-wider">
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
                        className={cn(
                          "flex items-center w-full px-2 py-2 text-sm rounded-md transition-colors cursor-pointer group relative",
                          isActive 
                            ? "text-white" 
                            : "text-[#6b7a90] hover:text-white"
                        )}
                        style={isActive ? { backgroundColor: "rgba(43, 79, 172, 0.15)" } : {}}
                      >
                        {isActive && (
                          <div 
                            className="absolute left-0 top-0 bottom-0 w-[3px] rounded-r-md" 
                            style={{ backgroundColor: "#2b4fac" }} 
                          />
                        )}
                        <span 
                          className={cn(
                            "absolute inset-0 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none",
                            !isActive && "bg-[rgba(43,79,172,0.15)]"
                          )}
                        />
                        <Icon className="mr-3 h-4 w-4 relative z-10" />
                        <span className="relative z-10">{item.name}</span>
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
      <div className="p-4 border-t border-white/10 shrink-0">
        <div className="flex items-center cursor-pointer group">
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white text-xs font-medium mr-3 group-hover:bg-white/20 transition-colors">
            TK
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm text-white font-medium truncate">Tulsa Kwik Dry</p>
          </div>
          <Settings className="h-4 w-4 text-[#6b7a90] group-hover:text-white transition-colors" />
        </div>
      </div>
    </div>
  );
}
