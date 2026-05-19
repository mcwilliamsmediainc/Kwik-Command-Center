import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  /* Lock body scroll only when sidebar overlay is open */
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);

  return (
    /*
     * h-screen + overflow-hidden pins the layout to exactly the viewport.
     * This means scrolling happens inside <main>, not at the body level —
     * which prevents the body overflow:hidden lock from also blocking page scroll.
     */
    <div className="flex h-full overflow-hidden bg-[#f0f2f5] font-sans">

      {/* Dark overlay — only rendered when sidebar is open, so it cannot
          intercept touch/scroll events when the sidebar is closed */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 md:hidden"
          style={{ backgroundColor: "rgba(0,0,0,0.50)", zIndex: 40 }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — slides in/out on mobile, always visible on desktop */}
      <div
        className={`fixed inset-y-0 left-0 transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ zIndex: 50 }}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content column — fills remaining width, never overflows sideways */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />
        {/*
         * overflow-y-auto here (not on body) is what makes page content scroll.
         * -webkit-overflow-scrolling: touch gives iOS momentum/rubber-band scrolling.
         * z-index: 1 ensures it sits above any residual stacking context.
         */}
        <main
          className="flex-1 overflow-y-auto p-4 md:p-6"
          style={{ WebkitOverflowScrolling: "touch", position: "relative", zIndex: 1 } as React.CSSProperties}
        >
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
