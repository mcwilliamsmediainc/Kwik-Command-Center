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
  Settings,
} from "lucide-react";

const NAV_SECTIONS = [
  {
    title: "OVERVIEW",
    items: [{ name: "Dashboard", href: "/", icon: LayoutDashboard }],
  },
  {
    title: "AGENTS",
    items: [
      { name: "Ryder", href: "/agents/ryder", icon: Bot },
      { name: "Dispatch", href: "/agents/dispatch", icon: Radio },
      { name: "Ledger", href: "/agents/ledger", icon: BookOpen },
      { name: "Scout", href: "/agents/scout", icon: Search },
    ],
  },
  {
    title: "INBOX",
    items: [{ name: "Unified Inbox", href: "/inbox", icon: Inbox }],
  },
  {
    title: "INTELLIGENCE",
    items: [
      { name: "Ask", href: "/intelligence/ask", icon: MessageSquare },
      { name: "Customers", href: "/intelligence/customers", icon: Users },
      { name: "Reactivation", href: "/intelligence/reactivation", icon: RefreshCw },
    ],
  },
  {
    title: "OPERATIONS",
    items: [
      { name: "Job Pipeline", href: "/operations/jobs", icon: GitBranch },
      { name: "Team & Pay", href: "/operations/team", icon: BadgeDollarSign },
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
        className="flex flex-col items-center flex-shrink-0 py-3"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        <img
          src="/kwikdry-logo.png"
          alt="Kwik Dry"
          style={{ maxWidth: 160, height: "auto", display: "block", margin: "0 auto" }}
        />
        <span
          style={{
            color: "rgba(255,255,255,0.35)",
            fontSize: 9,
            textTransform: "uppercase",
            letterSpacing: "1.5px",
            marginTop: 6,
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
                        <span className="relative z-10 group-hover:text-white transition-colors leading-none">
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
