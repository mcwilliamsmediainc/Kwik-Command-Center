import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  MessageCircle,
  Radio,
  TrendingUp,
  BarChart2,
  Inbox,
  Sparkles,
  Users,
  RefreshCw,
  ClipboardList,
  UserCheck,
  Settings,
} from "lucide-react";

const NAV_SECTIONS = [
  {
    title: "OVERVIEW",
    items: [
      { name: "Dashboard", href: "/", icon: LayoutDashboard, sub: "" },
    ],
  },
  {
    title: "AGENTS",
    items: [
      { name: "Ryder", href: "/agents/ryder", icon: MessageCircle, sub: "Customer AI" },
      { name: "Dispatch", href: "/agents/dispatch", icon: Radio, sub: "Call Center" },
      { name: "Ledger", href: "/agents/ledger", icon: TrendingUp, sub: "Finance & QB" },
      { name: "Scout", href: "/agents/scout", icon: BarChart2, sub: "Marketing" },
    ],
  },
  {
    title: "INBOX",
    items: [
      { name: "Unified Inbox", href: "/inbox", icon: Inbox, sub: "All Channels" },
    ],
  },
  {
    title: "INTELLIGENCE",
    items: [
      { name: "Ask", href: "/intelligence/ask", icon: Sparkles, sub: "Business Intel" },
      { name: "Customers", href: "/intelligence/customers", icon: Users, sub: "Memory Layer" },
      { name: "Reactivation", href: "/intelligence/reactivation", icon: RefreshCw, sub: "Win-Back" },
    ],
  },
  {
    title: "OPERATIONS",
    items: [
      { name: "Job Pipeline", href: "/operations/jobs", icon: ClipboardList, sub: "HouseCall Pro" },
      { name: "Team & Pay", href: "/operations/team", icon: UserCheck, sub: "Contractors" },
    ],
  },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="tkd-sidebar w-[240px] flex-shrink-0 h-screen sticky top-0 flex flex-col overflow-hidden">
      {/* Gradient accent bar */}
      <div className="tkd-sidebar-accent" />

      {/* Logo */}
      <div
        className="flex flex-col items-center flex-shrink-0 py-4"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        <img
          src="/kwikdry-logo.png"
          alt="Kwik Dry"
          style={{ maxWidth: 160, height: "auto", display: "block", margin: "0 auto", filter: "brightness(1.1) contrast(1.05)" }}
        />
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "2px",
            marginTop: 6,
            paddingTop: 8,
            borderTop: "1px solid rgba(255,255,255,0.08)",
            width: "80%",
            textAlign: "center",
            background: "linear-gradient(90deg, #4f7df7, #3db54a)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Command Center
        </span>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto py-4 space-y-5 px-3">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            <p className="tkd-section-label px-2 mb-1.5">{section.title}</p>

            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = location === item.href;
                const Icon = item.icon;

                return (
                  <li key={item.name}>
                    <Link href={item.href}>
                      <span
                        className={`relative flex items-center gap-3 w-full px-2 py-[7px] rounded-md text-sm cursor-pointer transition-colors group ${
                          isActive ? "tkd-nav-active" : "tkd-nav-inactive"
                        }`}
                        data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        {/* Hover overlay — inactive only */}
                        {!isActive && (
                          <span
                            className="absolute inset-0 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                            style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
                          />
                        )}

                        <Icon className="w-4 h-4 flex-shrink-0 relative z-10" />
                        <span className="relative z-10 flex flex-col min-w-0">
                          <span className="group-hover:text-white transition-colors leading-none">
                            {item.name}
                          </span>
                          {item.sub && (
                            <span
                              style={{
                                fontSize: 9,
                                color: "rgba(255,255,255,0.40)",
                                display: "block",
                                marginTop: 1,
                                lineHeight: 1,
                              }}
                            >
                              {item.sub}
                            </span>
                          )}
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

      {/* User */}
      <div
        className="flex items-center gap-3 px-4 py-3.5 flex-shrink-0 cursor-pointer group"
        style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
          style={{ backgroundColor: "rgba(255,255,255,0.14)" }}
        >
          TK
        </div>
        <span className="flex-1 text-sm font-medium truncate" style={{ color: "rgba(255,255,255,0.85)" }}>
          Tulsa Kwik Dry
        </span>
        <Settings className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(255,255,255,0.35)" }} />
      </div>
    </div>
  );
}
