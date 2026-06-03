import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { Plus, Trash2, Upload, CheckCircle2, XCircle, Save, RefreshCw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  useProfile,
  useProfileActions,
  type BusinessProfile,
  type DeepPartial,
} from "@/context/ProfileContext";

function fmtSync(iso: string | null): string {
  if (!iso) return "Never synced";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "Never synced";
  return d.toLocaleString();
}

function StatusPill({ connected }: { connected: boolean }) {
  return connected ? (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full" style={{ backgroundColor: "#dcfce7", color: "#15803d" }}>
      <CheckCircle2 className="w-3 h-3" /> Connected
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full" style={{ backgroundColor: "#fee2e2", color: "#b91c1c" }}>
      <XCircle className="w-3 h-3" /> Disconnected
    </span>
  );
}

export function SettingsPage() {
  const profile = useProfile();
  const { updateProfile } = useProfileActions();
  const { toast } = useToast();

  /* Local draft state — initialized from profile once, then user-owned.
     We do NOT auto-resync from profile because that would clobber edits
     in other tabs whenever one tab saves. After each save we manually
     merge ONLY the keys that were saved back into draft, so masked
     secrets returned by the server appear without nuking in-flight work. */
  const [draft, setDraft] = useState<BusinessProfile>(profile);
  const initialized = useRef(false);
  useEffect(() => {
    if (!initialized.current) {
      setDraft(profile);
      initialized.current = true;
    }
  }, [profile]);

  const [saving, setSaving] = useState<string | null>(null);

  /* Live QuickBooks connection status (from /api/quickbooks/health), used to
     surface a Reconnect link when the OAuth token needs re-authorization. */
  const [qbo, setQbo] = useState<{
    connected: boolean;
    companyName: string | null;
    needsReauth: boolean;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/quickbooks/health")
      .then((r) => (r.ok ? r.json() : null))
      .then((h) => {
        if (cancelled || !h) return;
        setQbo({
          connected: Boolean(h.connected),
          companyName: h.companyName ?? null,
          needsReauth: Boolean(h.needsReauth),
        });
      })
      .catch(() => { /* leave as null — fall back to profile flag */ });
    return () => { cancelled = true; };
  }, []);

  /* Surface the result of the OAuth callback redirect (?qbo=connected|error). */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("qbo");
    if (!status) return;
    if (status === "connected") {
      const company = params.get("company");
      toast({
        title: "QuickBooks connected",
        description: company ? `Connected: ${company}` : "QuickBooks connected.",
      });
    } else if (status === "error") {
      toast({
        title: "QuickBooks connection failed",
        description: params.get("message") || "Please try reconnecting.",
        variant: "destructive",
      });
    }
    window.history.replaceState({}, "", window.location.pathname);
  }, [toast]);

  async function save(label: string, patch: DeepPartial<BusinessProfile>) {
    setSaving(label);
    try {
      const next = await updateProfile(patch);
      /* merge just the patched top-level keys back into draft */
      setDraft((d) => {
        const merged = { ...d } as unknown as Record<string, unknown>;
        const src = next as unknown as Record<string, unknown>;
        for (const k of Object.keys(patch)) merged[k] = src[k];
        return merged as unknown as BusinessProfile;
      });
      toast({ title: "Saved", description: `${label} updated successfully.` });
    } catch (err) {
      toast({ title: "Save failed", description: String((err as Error).message || err), variant: "destructive" });
    } finally {
      setSaving(null);
    }
  }

  /* ─── TAB 1: Business profile ─────────────────────────────────── */
  function saveBusiness() {
    void save("Business profile", {
      business_name:       draft.business_name,
      business_short_name: draft.business_short_name,
      industry:            draft.industry,
      app_name:            draft.app_name,
      phone:               draft.phone,
      email:               draft.email,
      website:             draft.website,
      address:             draft.address,
      hours:               draft.hours,
      timezone:            draft.timezone,
      logo_url:            draft.logo_url,
      primary_color:       draft.primary_color,
      secondary_color:     draft.secondary_color,
    });
  }

  const fileRef = useRef<HTMLInputElement>(null);
  function onLogoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500_000) {
      toast({ title: "Logo too large", description: "Please choose an image under 500 KB.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      setDraft((d) => ({ ...d, logo_url: dataUrl }));
    };
    reader.readAsDataURL(file);
  }

  /* ─── TAB 2: Services ────────────────────────────────────────── */
  function setService(idx: number, patch: Partial<BusinessProfile["services"][number]>) {
    setDraft((d) => ({
      ...d,
      services: d.services.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    }));
  }
  function addService() {
    setDraft((d) => ({
      ...d,
      services: [...d.services, { name: "New Service", min_price: 0, description: "", active: true }],
    }));
  }
  function removeService(idx: number) {
    setDraft((d) => ({ ...d, services: d.services.filter((_, i) => i !== idx) }));
  }

  /* ─── TAB 3: Team ─────────────────────────────────────────────── */
  function setTech(idx: number, patch: Partial<BusinessProfile["technicians"][number]>) {
    setDraft((d) => ({
      ...d,
      technicians: d.technicians.map((t, i) => (i === idx ? { ...t, ...patch } : t)),
    }));
  }
  function addTech() {
    setDraft((d) => ({ ...d, technicians: [...d.technicians, { name: "New Technician", pay_rate: d.pay_rate_per_job }] }));
  }
  function removeTech(idx: number) {
    setDraft((d) => ({ ...d, technicians: d.technicians.filter((_, i) => i !== idx) }));
  }

  /* ─── TAB 4: Integrations ─────────────────────────────────────── */
  function setIntegrationField<K extends keyof BusinessProfile["integrations"]>(
    key: K,
    patch: Partial<BusinessProfile["integrations"][K]>,
  ) {
    setDraft((d) => ({
      ...d,
      integrations: { ...d.integrations, [key]: { ...d.integrations[key], ...patch } },
    }));
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "#1a2333" }}>Settings</h1>
        <p className="text-sm mt-1" style={{ color: "#6b7a90" }}>
          White-label your command center. Changes broadcast to every agent and dashboard in real time.
        </p>
      </div>

      <Tabs defaultValue="business" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="business"     data-testid="tab-business">Business Profile</TabsTrigger>
          <TabsTrigger value="services"     data-testid="tab-services">Services & Pricing</TabsTrigger>
          <TabsTrigger value="team"         data-testid="tab-team">Team</TabsTrigger>
          <TabsTrigger value="integrations" data-testid="tab-integrations">Integrations</TabsTrigger>
        </TabsList>

        {/* ─── TAB 1 ─── */}
        <TabsContent value="business" className="space-y-6">
          <Card title="Identity">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Business name">
                <Input value={draft.business_name} onChange={(e) => setDraft({ ...draft, business_name: e.target.value })} data-testid="input-business-name" />
              </Field>
              <Field label="Short name">
                <Input value={draft.business_short_name} onChange={(e) => setDraft({ ...draft, business_short_name: e.target.value })} data-testid="input-short-name" />
              </Field>
              <Field label="Industry">
                <Input value={draft.industry} onChange={(e) => setDraft({ ...draft, industry: e.target.value })} />
              </Field>
              <Field label="App name">
                <Input value={draft.app_name} onChange={(e) => setDraft({ ...draft, app_name: e.target.value })} />
              </Field>
            </div>
          </Card>

          <Card title="Contact">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Phone"><Input value={draft.phone}   onChange={(e) => setDraft({ ...draft, phone: e.target.value })} data-testid="input-phone" /></Field>
              <Field label="Email"><Input value={draft.email}   onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></Field>
              <Field label="Website"><Input value={draft.website} onChange={(e) => setDraft({ ...draft, website: e.target.value })} /></Field>
              <Field label="Address"><Input value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} /></Field>
              <Field label="Hours"><Input value={draft.hours}     onChange={(e) => setDraft({ ...draft, hours: e.target.value })} /></Field>
              <Field label="Timezone"><Input value={draft.timezone} onChange={(e) => setDraft({ ...draft, timezone: e.target.value })} /></Field>
            </div>
          </Card>

          <Card title="Branding">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#6b7a90" }}>Logo</Label>
                <div className="mt-2 flex items-center gap-4">
                  <div
                    className="flex items-center justify-center"
                    style={{
                      backgroundColor: "#ffffff",
                      borderRadius: "8px",
                      padding: "8px",
                      border: "1px solid rgba(0,0,0,0.08)",
                      maxWidth: "160px",
                      minWidth: "96px",
                      minHeight: "96px",
                    }}
                  >
                    {draft.logo_url ? (
                      <img
                        src={draft.logo_url}
                        alt="logo preview"
                        style={{ maxWidth: "160px", height: "auto", display: "block" }}
                      />
                    ) : (
                      <span className="text-xs" style={{ color: "#6b7a90" }}>No logo</span>
                    )}
                  </div>
                  <div>
                    <input ref={fileRef} type="file" accept="image/*" onChange={onLogoChange} className="hidden" data-testid="input-logo-file" />
                    <div className="flex flex-col gap-2">
                      <Button variant="outline" type="button" onClick={() => fileRef.current?.click()} data-testid="button-upload-logo">
                        <Upload className="w-4 h-4 mr-2" /> Upload Logo
                      </Button>
                      <Button
                        variant="outline"
                        type="button"
                        onClick={() => {
                          setDraft((d) => ({ ...d, logo_url: "" }));
                          if (fileRef.current) fileRef.current.value = "";
                        }}
                        disabled={!draft.logo_url}
                        data-testid="button-remove-logo"
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> Remove Logo
                      </Button>
                    </div>
                    <p className="text-[11px] mt-2" style={{ color: "#6b7a90" }}>PNG/SVG/JPG up to 500 KB. Stored as base64.</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Primary color">
                  <div className="flex gap-2">
                    <input type="color" value={draft.primary_color} onChange={(e) => setDraft({ ...draft, primary_color: e.target.value })} className="w-12 h-10 rounded border cursor-pointer" data-testid="input-primary-color" />
                    <Input value={draft.primary_color} onChange={(e) => setDraft({ ...draft, primary_color: e.target.value })} />
                  </div>
                </Field>
                <Field label="Secondary color">
                  <div className="flex gap-2">
                    <input type="color" value={draft.secondary_color} onChange={(e) => setDraft({ ...draft, secondary_color: e.target.value })} className="w-12 h-10 rounded border cursor-pointer" data-testid="input-secondary-color" />
                    <Input value={draft.secondary_color} onChange={(e) => setDraft({ ...draft, secondary_color: e.target.value })} />
                  </div>
                </Field>
              </div>
            </div>
          </Card>

          <div className="flex justify-end">
            <Button onClick={saveBusiness} disabled={saving !== null} data-testid="button-save-business">
              <Save className="w-4 h-4 mr-2" />
              {saving === "Business profile" ? "Saving…" : "Save Business Profile"}
            </Button>
          </div>
        </TabsContent>

        {/* ─── TAB 2 ─── */}
        <TabsContent value="services" className="space-y-4">
          <Card title="Services">
            <div className="space-y-3">
              <div className="grid grid-cols-12 gap-2 text-[11px] font-semibold uppercase tracking-wider px-2" style={{ color: "#6b7a90" }}>
                <div className="col-span-3">Name</div>
                <div className="col-span-2">Min Price</div>
                <div className="col-span-5">Description</div>
                <div className="col-span-1 text-center">Active</div>
                <div className="col-span-1"></div>
              </div>
              {draft.services.map((s, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center" data-testid={`row-service-${i}`}>
                  <Input className="col-span-3" value={s.name}  onChange={(e) => setService(i, { name: e.target.value })} />
                  <Input className="col-span-2" type="number" value={s.min_price} onChange={(e) => setService(i, { min_price: Number(e.target.value) || 0 })} />
                  <Input className="col-span-5" value={s.description} onChange={(e) => setService(i, { description: e.target.value })} />
                  <div className="col-span-1 flex justify-center">
                    <Switch checked={s.active} onCheckedChange={(v) => setService(i, { active: v })} />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <Button variant="ghost" size="icon" onClick={() => removeService(i)} data-testid={`button-delete-service-${i}`}>
                      <Trash2 className="w-4 h-4" style={{ color: "#b91c1c" }} />
                    </Button>
                  </div>
                </div>
              ))}
              <Button variant="outline" onClick={addService} data-testid="button-add-service">
                <Plus className="w-4 h-4 mr-2" /> Add Service
              </Button>
            </div>
          </Card>
          <div className="flex justify-end">
            <Button onClick={() => save("Services", { services: draft.services })} disabled={saving !== null} data-testid="button-save-services">
              <Save className="w-4 h-4 mr-2" />
              {saving === "Services" ? "Saving…" : "Save Services"}
            </Button>
          </div>
        </TabsContent>

        {/* ─── TAB 3 ─── */}
        <TabsContent value="team" className="space-y-4">
          <Card title="Default pay rate">
            <Field label="Pay rate per job (USD)">
              <Input type="number" value={draft.pay_rate_per_job} onChange={(e) => setDraft({ ...draft, pay_rate_per_job: Number(e.target.value) || 0 })} className="max-w-xs" data-testid="input-default-pay-rate" />
            </Field>
          </Card>

          <Card title="Technicians">
            <div className="space-y-3">
              <div className="grid grid-cols-12 gap-2 text-[11px] font-semibold uppercase tracking-wider px-2" style={{ color: "#6b7a90" }}>
                <div className="col-span-7">Name</div>
                <div className="col-span-4">Pay rate / job</div>
                <div className="col-span-1"></div>
              </div>
              {draft.technicians.map((t, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center" data-testid={`row-tech-${i}`}>
                  <Input className="col-span-7" value={t.name}   onChange={(e) => setTech(i, { name: e.target.value })} />
                  <Input className="col-span-4" type="number" value={t.pay_rate} onChange={(e) => setTech(i, { pay_rate: Number(e.target.value) || 0 })} />
                  <div className="col-span-1 flex justify-end">
                    <Button variant="ghost" size="icon" onClick={() => removeTech(i)} data-testid={`button-remove-tech-${i}`}>
                      <Trash2 className="w-4 h-4" style={{ color: "#b91c1c" }} />
                    </Button>
                  </div>
                </div>
              ))}
              <Button variant="outline" onClick={addTech} data-testid="button-add-tech">
                <Plus className="w-4 h-4 mr-2" /> Add Technician
              </Button>
            </div>
          </Card>

          <div className="flex justify-end">
            <Button
              onClick={() => save("Team", { technicians: draft.technicians, pay_rate_per_job: draft.pay_rate_per_job })}
              disabled={saving !== null}
              data-testid="button-save-team"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving === "Team" ? "Saving…" : "Save Team"}
            </Button>
          </div>
        </TabsContent>

        {/* ─── TAB 4 ─── */}
        <TabsContent value="integrations" className="space-y-4">
          <Card title={(
            <div className="flex items-center justify-between w-full">
              <span>HouseCall Pro</span>
              <StatusPill connected={draft.integrations.housecallpro.connected} />
            </div>
          )}>
            <div className="space-y-3">
              <Field label="API key">
                <Input
                  type="password"
                  placeholder={draft.integrations.housecallpro.api_key || "Paste your HouseCall Pro API key"}
                  value={draft.integrations.housecallpro.api_key}
                  onChange={(e) => setIntegrationField("housecallpro", { api_key: e.target.value })}
                  data-testid="input-hcp-key"
                />
              </Field>
              <div className="flex items-center justify-between">
                <span className="text-xs flex items-center gap-1.5" style={{ color: "#6b7a90" }}>
                  <RefreshCw className="w-3 h-3" /> Last sync: {fmtSync(draft.integrations.housecallpro.last_sync)}
                </span>
                <div className="flex items-center gap-2">
                  <Label htmlFor="hcp-conn" className="text-xs">Connected</Label>
                  <Switch
                    id="hcp-conn"
                    checked={draft.integrations.housecallpro.connected}
                    onCheckedChange={(v) => setIntegrationField("housecallpro", { connected: v })}
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card title={(
            <div className="flex items-center justify-between w-full">
              <span>QuickBooks</span>
              <StatusPill connected={qbo?.connected ?? draft.integrations.quickbooks.connected} />
            </div>
          )}>
            {qbo?.connected && qbo.companyName ? (
              <p className="text-xs" style={{ color: "#6b7a90" }}>
                Connected: <span className="font-semibold" style={{ color: "#1f2d3d" }}>{qbo.companyName}</span>
              </p>
            ) : (
              <p className="text-xs" style={{ color: "#6b7a90" }}>
                QuickBooks connection is managed via OAuth.
              </p>
            )}

            {(qbo?.needsReauth || qbo?.connected === false) && (
              <a
                href="/api/auth/quickbooks"
                className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold px-3 py-1.5 rounded-md text-white"
                style={{ backgroundColor: "var(--brand-primary)" }}
              >
                <RefreshCw className="w-3 h-3" /> Reconnect QuickBooks
              </a>
            )}

            <p className="text-xs mt-2 flex items-center gap-1.5" style={{ color: "#6b7a90" }}>
              <RefreshCw className="w-3 h-3" /> Last sync: {fmtSync(draft.integrations.quickbooks.last_sync)}
            </p>
          </Card>

          <Card title={(
            <div className="flex items-center justify-between w-full">
              <span>WhatsApp (Twilio)</span>
              <StatusPill connected={Boolean(draft.integrations.whatsapp.twilio_number)} />
            </div>
          )}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Twilio Account SID">
                <Input
                  type="password"
                  placeholder={draft.integrations.whatsapp.twilio_sid || "AC…"}
                  value={draft.integrations.whatsapp.twilio_sid}
                  onChange={(e) => setIntegrationField("whatsapp", { twilio_sid: e.target.value })}
                  data-testid="input-twilio-sid"
                />
              </Field>
              <Field label="Twilio Auth Token">
                <Input
                  type="password"
                  placeholder={draft.integrations.whatsapp.twilio_token || "Token"}
                  value={draft.integrations.whatsapp.twilio_token}
                  onChange={(e) => setIntegrationField("whatsapp", { twilio_token: e.target.value })}
                  data-testid="input-twilio-token"
                />
              </Field>
              <Field label="WhatsApp number">
                <Input
                  placeholder="whatsapp:+15555550123"
                  value={draft.integrations.whatsapp.twilio_number}
                  onChange={(e) => setIntegrationField("whatsapp", { twilio_number: e.target.value })}
                  data-testid="input-twilio-number"
                />
              </Field>
            </div>
            <p className="text-xs mt-3 flex items-center gap-1.5" style={{ color: "#6b7a90" }}>
              <RefreshCw className="w-3 h-3" /> Last sync: {fmtSync(draft.integrations.whatsapp.last_sync)}
            </p>
          </Card>

          <Card title={(
            <div className="flex items-center justify-between w-full">
              <span>Google Places</span>
              <StatusPill connected={Boolean(draft.integrations.google_places.api_key)} />
            </div>
          )}>
            <Field label="API key">
              <Input
                type="password"
                placeholder={draft.integrations.google_places.api_key || "Paste your Google Places API key"}
                value={draft.integrations.google_places.api_key}
                onChange={(e) => setIntegrationField("google_places", { api_key: e.target.value })}
                data-testid="input-google-key"
              />
            </Field>
            <p className="text-xs mt-3 flex items-center gap-1.5" style={{ color: "#6b7a90" }}>
              <RefreshCw className="w-3 h-3" /> Last sync: {fmtSync(draft.integrations.google_places.last_sync)}
            </p>
          </Card>

          <div className="rounded-lg p-3 text-xs" style={{ backgroundColor: "#fef9c3", color: "#854d0e", border: "1px solid #fde68a" }}>
            <strong>Note:</strong> API keys and tokens are masked after save (showing only the last 4 chars). Re-paste a value to change it.
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => save("Integrations", { integrations: draft.integrations })}
              disabled={saving !== null}
              data-testid="button-save-integrations"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving === "Integrations" ? "Saving…" : "Save Integrations"}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ─── tiny presentational helpers ──────────────────────────────── */
function Card({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <div className="bg-white rounded-lg p-5" style={{ border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
      <div className="mb-4 text-sm font-bold" style={{ color: "#1a2333" }}>{title}</div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#6b7a90" }}>{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

/* unused import shim — keeps Textarea available for future fields without warning */
void Textarea;
