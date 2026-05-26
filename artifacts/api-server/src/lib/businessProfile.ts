export interface IntegrationsState {
  housecallpro:  { api_key: string; connected: boolean; last_sync: string | null };
  quickbooks:    {                  connected: boolean; last_sync: string | null };
  whatsapp:      { twilio_sid: string; twilio_token: string; twilio_number: string; last_sync: string | null };
  google_places: { api_key: string;                       last_sync: string | null };
}

export interface BusinessProfile {
  business_name: string;
  business_short_name: string;
  industry: string;
  naics_code: string;
  owner_name: string;

  phone: string;
  email: string;
  website: string;
  address: string;

  primary_color: string;
  secondary_color: string;
  logo_url: string;
  app_name: string;

  service_area: string[];

  services: Array<{ name: string; min_price: number; description: string; active: boolean }>;

  technicians: Array<{ name: string; pay_rate: number }>;
  pay_rate_per_job: number;

  booking_url: string;
  housecallpro_connected: boolean;
  quickbooks_connected: boolean;
  google_place_id: string;

  agents: {
    customer_faq: string;
    financial: string;
    dispatch: string;
    marketing: string;
    orchestrator: string;
  };

  hours: string;
  timezone: string;

  integrations: IntegrationsState;
}

/* ─── Tenant profile loading ──────────────────────────────────────
   Profiles live as pure JSON in ../profiles/<tenant>.json and are
   selected at boot via the TENANT_ID env var. Adding a new client:
     1. Drop ../profiles/<their-id>.json
     2. Register it in the PROFILES map below
     3. Set TENANT_ID=<their-id> in that Replit's Secrets
   API keys (HCP, QB, Google, Twilio) are *not* in the profile —
   each client's Replit carries its own Secrets.                    */
import kwikdryProfile from "../profiles/kwikdry.json" with { type: "json" };

const PROFILES: Record<string, BusinessProfile> = {
  kwikdry: kwikdryProfile as BusinessProfile,
};

function loadTenantProfile(): BusinessProfile {
  const tenantId = process.env["TENANT_ID"];
  if (!tenantId) {
    throw new Error("TENANT_ID environment variable is required but was not provided.");
  }
  const loaded = PROFILES[tenantId];
  if (!loaded) {
    throw new Error(
      `Unknown TENANT_ID "${tenantId}". Known tenants: ${Object.keys(PROFILES).join(", ")}`,
    );
  }
  /* Clone so the in-memory mutable state is isolated from the imported JSON. */
  return JSON.parse(JSON.stringify(loaded)) as BusinessProfile;
}

export const businessProfile: BusinessProfile = loadTenantProfile();

/* ─── Secret masking ───────────────────────────────────────────────
   We never echo full API keys / tokens back to the client. The UI
   shows "••••<last4>" when a value is set, "" when empty, and a
   pre-merge pass strips mask-shaped values from *known secret paths
   only* (see SECRET_PATHS) so editing other fields doesn't wipe the
   secret.                                                            */
const MASK_RE = /^•+/;

export const SECRET_PATHS: ReadonlyArray<readonly [string, string]> = [
  ["integrations", "housecallpro.api_key"],
  ["integrations", "whatsapp.twilio_sid"],
  ["integrations", "whatsapp.twilio_token"],
  ["integrations", "google_places.api_key"],
];

export function isMaskedSecret(v: unknown): boolean {
  return typeof v === "string" && MASK_RE.test(v);
}

export function maskSecret(v: string): string {
  if (!v) return "";
  if (v.length <= 4) return "••••";
  return "••••" + v.slice(-4);
}

export function publicProfile(p: BusinessProfile): BusinessProfile {
  return {
    ...p,
    integrations: {
      housecallpro: { ...p.integrations.housecallpro, api_key: maskSecret(p.integrations.housecallpro.api_key) },
      quickbooks:   { ...p.integrations.quickbooks },
      whatsapp: {
        ...p.integrations.whatsapp,
        twilio_sid:   maskSecret(p.integrations.whatsapp.twilio_sid),
        twilio_token: maskSecret(p.integrations.whatsapp.twilio_token),
      },
      google_places: { ...p.integrations.google_places, api_key: maskSecret(p.integrations.google_places.api_key) },
    },
  };
}

/* ─── Patch application ───────────────────────────────────────────
   Deep-merges allowed top-level fields. Skips any string value that
   is mask-shaped so the user can save other fields without nuking a
   stored secret. Mutates `businessProfile` in place.                */
export type DeepPartial<T> = T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T;

const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function deepMerge(target: Record<string, unknown>, patch: Record<string, unknown>): void {
  for (const key of Object.keys(patch)) {
    if (FORBIDDEN_KEYS.has(key)) continue;
    if (!Object.prototype.hasOwnProperty.call(patch, key)) continue;
    const next = patch[key];
    if (next === undefined) continue;
    const cur = target[key];
    if (
      next !== null && typeof next === "object" && !Array.isArray(next) &&
      cur  !== null && typeof cur  === "object" && !Array.isArray(cur)
    ) {
      deepMerge(cur as Record<string, unknown>, next as Record<string, unknown>);
    } else {
      target[key] = next;
    }
  }
}

/* Walks SECRET_PATHS and deletes any mask-shaped values from the
   patch *before* it reaches deepMerge — so legitimate strings that
   happen to begin with "•" elsewhere are preserved. */
function stripMaskedSecrets(patch: Record<string, unknown>): void {
  for (const [topKey, dotted] of SECRET_PATHS) {
    const top = patch[topKey];
    if (!top || typeof top !== "object") continue;
    const parts = dotted.split(".");
    let node: Record<string, unknown> = top as Record<string, unknown>;
    for (let i = 0; i < parts.length - 1; i++) {
      const k = parts[i]!;
      const child = node[k];
      if (!child || typeof child !== "object") { node = null as unknown as Record<string, unknown>; break; }
      node = child as Record<string, unknown>;
    }
    if (!node) continue;
    const leaf = parts[parts.length - 1]!;
    if (isMaskedSecret(node[leaf])) delete node[leaf];
  }
}

export function applyProfilePatch(patch: DeepPartial<BusinessProfile>): BusinessProfile {
  const safe = patch as Record<string, unknown>;
  stripMaskedSecrets(safe);
  deepMerge(businessProfile as unknown as Record<string, unknown>, safe);
  /* keep top-level connection flags in sync with integrations sub-state */
  businessProfile.housecallpro_connected = businessProfile.integrations.housecallpro.connected;
  businessProfile.quickbooks_connected   = businessProfile.integrations.quickbooks.connected;
  return businessProfile;
}
