import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiKey, setApiKey } from "@/lib/apiKey";

async function verifyKey(key: string): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/verify", { headers: { "x-api-key": key } });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Stopgap admin gate: requires the shared Command Center key before the app can
 * reach any business-data API. The key is stored in localStorage and attached to
 * every `/api` request by the fetch wrapper. This is a shared secret, not real
 * per-user auth — proper login is a follow-up.
 */
export function AdminGate({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [keyInput, setKeyInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const existing = getApiKey();
    if (!existing) {
      setAuthed(false);
      return;
    }
    void verifyKey(existing).then(setAuthed);
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const candidate = keyInput.trim();
    if (!candidate) return;
    setChecking(true);
    setError(null);
    const ok = await verifyKey(candidate);
    setChecking(false);
    if (ok) {
      setApiKey(candidate);
      setAuthed(true);
    } else {
      setError("That key was not accepted. Double-check the value and try again.");
    }
  }

  if (authed === null) return null;
  if (authed) return <>{children}</>;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-5 rounded-xl border bg-card p-8 shadow-sm"
      >
        <div className="space-y-1.5">
          <h1 className="text-xl font-semibold tracking-tight">Command Center</h1>
          <p className="text-sm text-muted-foreground">
            Enter your access key to continue.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="cc-key">Access key</Label>
          <Input
            id="cc-key"
            type="password"
            autoComplete="off"
            autoFocus
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder="••••••••-••••-••••"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <Button type="submit" className="w-full" disabled={checking}>
          {checking ? "Checking…" : "Unlock"}
        </Button>
      </form>
    </div>
  );
}
