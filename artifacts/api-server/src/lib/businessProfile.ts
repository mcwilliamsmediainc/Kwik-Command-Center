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

export const businessProfile: BusinessProfile = {
  business_name: "Tulsa Kwik Dry Total Cleaning",
  business_short_name: "Kwik Dry",
  industry: "Carpet & Home Cleaning",
  naics_code: "561740",
  owner_name: "",

  phone: "(918) 238-2986",
  email: "tulsakwikdry@gmail.com",
  website: "https://tulsakwikdry.com",
  address: "2430 W New Orleans St, Broken Arrow OK 74011",

  primary_color: "#2b4fac",
  secondary_color: "#3db54a",
  logo_url: "/kwikdry-logo.png",
  app_name: "Command Center",

  service_area: [
    "Tulsa", "Broken Arrow", "Bixby", "Jenks",
    "Owasso", "Sand Springs", "Claremore", "Glenpool",
    "Collinsville", "Catoosa", "Coweta", "Sapulpa",
    "Skiatook", "Wagoner",
  ],

  services: [
    { name: "Carpet Cleaning",   min_price: 88,  description: "First 2 rooms $88, whole house $188",       active: true },
    { name: "Upholstery",        min_price: 55,  description: "Chair $55, sofa $95, sectional $145-$300",  active: true },
    { name: "Air Duct Cleaning", min_price: 199, description: "Up to 10 vents $199",                       active: true },
    { name: "Dryer Vent",        min_price: 99,  description: "Side wall $99, through roof $149",          active: true },
    { name: "Tile & Grout",      min_price: 99,  description: "First 2 areas $99",                         active: true },
    { name: "Mattress",          min_price: 69,  description: "Twin $69 to King $109",                     active: true },
    { name: "Wood Floor",        min_price: 150, description: "$1.50/sq ft",                               active: true },
  ],

  technicians: [
    { name: "Isiah Ervin",     pay_rate: 40 },
    { name: "Peyton Mueters",  pay_rate: 40 },
    { name: "Anthony Rodgers", pay_rate: 40 },
    { name: "Evan Hoover",     pay_rate: 40 },
  ],
  pay_rate_per_job: 40,

  booking_url: "https://book.housecallpro.com/book/Tulsa-Kwik-Dry",
  housecallpro_connected: true,
  quickbooks_connected: true,
  google_place_id: "",

  agents: {
    customer_faq: "Ryder",
    financial:    "Finn",
    dispatch:     "Dispatch",
    marketing:    "Scout",
    orchestrator: "Ask",
  },

  hours: "Monday\u2013Saturday 7am\u201310pm",
  timezone: "America/Chicago",

  integrations: {
    housecallpro:  { api_key: "",      connected: true,  last_sync: new Date().toISOString() },
    quickbooks:    {                   connected: true,  last_sync: new Date().toISOString() },
    whatsapp:      { twilio_sid: "",   twilio_token: "", twilio_number: "", last_sync: null },
    google_places: { api_key: "",      last_sync: null },
  },
};

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
