import { useRef, useState } from "react";
import { Sparkles, RotateCcw, Check, Loader2 } from "lucide-react";
import { useProfile, useProfileActions } from "@/context/ProfileContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { DEMO_PRESETS, KWIKDRY_PRESET, type DemoPreset } from "@/lib/demoPresets";

export function DemoModePage() {
  const profile = useProfile();
  const { updateProfile, refresh } = useProfileActions();
  const { toast } = useToast();
  const [pendingId, setPendingId] = useState<string | null>(null);
  /* Last-write-wins guard: each click bumps the nonce; only the most
     recent in-flight request is allowed to apply its result. Prevents
     out-of-order PATCH responses from clobbering the latest selection
     if a sales rep mashes preset cards. */
  const intentRef = useRef(0);

  async function activate(preset: DemoPreset) {
    /* Global lock: only one switch at a time. */
    if (pendingId !== null) return;
    const myIntent = ++intentRef.current;
    setPendingId(preset.id);
    try {
      await updateProfile(preset.patch);
      if (myIntent !== intentRef.current) {
        /* A newer click superseded us — let the newer call own the toast. */
        return;
      }
      toast({
        title: `Activated: ${preset.label}`,
        description: "The whole Command Center has rebranded in real time.",
      });
    } catch (err) {
      if (myIntent !== intentRef.current) return;
      toast({
        title: "Could not switch profile",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
      /* Re-sync from server so the UI never shows a stale "Live" badge. */
      void refresh();
    } finally {
      if (myIntent === intentRef.current) setPendingId(null);
    }
  }

  const activeId =
    [KWIKDRY_PRESET, ...DEMO_PRESETS].find(
      (p) => p.patch.business_name === profile.business_name,
    )?.id ?? null;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5" style={{ color: profile.primary_color }} />
            <h1 className="text-2xl font-bold tracking-tight">Demo Mode</h1>
          </div>
          <p className="text-sm" style={{ color: "#6b7a90" }}>
            Switch to a prospect's industry and watch the entire Command Center
            rebrand instantly &mdash; their colors, their name, their services.
            Perfect for sales calls.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => activate(KWIKDRY_PRESET)}
          disabled={pendingId !== null}
          data-testid="button-restore-kwikdry"
        >
          <RotateCcw className="w-4 h-4 mr-2" /> Restore Kwik Dry
        </Button>
      </div>

      <div
        className="mb-6 px-4 py-3 rounded-lg text-sm"
        style={{
          backgroundColor: "rgba(43, 79, 172, 0.06)",
          border: "1px solid rgba(43, 79, 172, 0.18)",
          color: "#2b4fac",
        }}
      >
        <strong>Currently live:</strong> {profile.business_name} &middot;{" "}
        {profile.industry} &middot; {profile.app_name}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {DEMO_PRESETS.map((preset) => {
          const isActive = activeId === preset.id;
          const isPending = pendingId === preset.id;
          const primary = (preset.patch.primary_color as string) ?? "#2b4fac";
          const secondary = (preset.patch.secondary_color as string) ?? "#3db54a";
          const services = preset.patch.services ?? [];
          const area = preset.patch.service_area ?? [];

          return (
            <div
              key={preset.id}
              className="rounded-xl bg-white overflow-hidden flex flex-col"
              style={{
                border: isActive
                  ? `2px solid ${primary}`
                  : "1px solid rgba(0,0,0,0.08)",
                boxShadow: isActive
                  ? `0 0 0 4px ${primary}1a`
                  : "0 1px 2px rgba(0,0,0,0.04)",
              }}
              data-testid={`preset-card-${preset.id}`}
            >
              {/* Branded header strip */}
              <div
                className="h-20 flex items-center justify-between px-4"
                style={{
                  background: `linear-gradient(90deg, ${primary}, ${secondary})`,
                }}
              >
                <div className="text-white">
                  <div className="text-[10px] uppercase tracking-widest opacity-80">
                    {preset.patch.industry}
                  </div>
                  <div className="text-lg font-extrabold">
                    {preset.patch.business_short_name}
                  </div>
                </div>
                {isActive && (
                  <span
                    className="text-[11px] font-semibold uppercase tracking-wider px-2 py-1 rounded"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.22)",
                      color: "white",
                    }}
                  >
                    <Check className="w-3 h-3 inline mr-1" /> Live
                  </span>
                )}
              </div>

              <div className="p-4 flex-1 flex flex-col">
                <div className="mb-3">
                  <div className="text-sm font-semibold">{preset.label}</div>
                  <div className="text-xs" style={{ color: "#6b7a90" }}>
                    {preset.tagline}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs mb-4">
                  <div>
                    <div className="font-semibold mb-1" style={{ color: "#6b7a90" }}>
                      Top services
                    </div>
                    <ul className="space-y-0.5" style={{ color: "#334155" }}>
                      {services.slice(0, 3).map((s) => (
                        <li key={s?.name}>
                          &middot; {s?.name}
                          {s?.min_price ? ` from $${s.min_price}` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="font-semibold mb-1" style={{ color: "#6b7a90" }}>
                      Service area
                    </div>
                    <div style={{ color: "#334155" }}>
                      {area.slice(0, 4).join(", ")}
                      {area.length > 4 ? `, +${area.length - 4}` : ""}
                    </div>
                  </div>
                </div>

                <Button
                  className="mt-auto w-full text-white"
                  style={{
                    backgroundColor: isActive ? "#94a3b8" : primary,
                    borderColor: "transparent",
                  }}
                  disabled={isActive || pendingId !== null}
                  onClick={() => activate(preset)}
                  data-testid={`button-activate-${preset.id}`}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />{" "}
                      Switching&hellip;
                    </>
                  ) : isActive ? (
                    <>
                      <Check className="w-4 h-4 mr-2" /> Already live
                    </>
                  ) : (
                    <>Activate this profile</>
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs mt-6 text-center" style={{ color: "#6b7a90" }}>
        Profile changes are saved to the server and broadcast to every page in
        real time. Use <strong>Restore Kwik Dry</strong> to return to the default
        before publishing.
      </p>
    </div>
  );
}
