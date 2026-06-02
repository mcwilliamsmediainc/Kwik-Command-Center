import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

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
  pricing_notes?: string[];

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

export type DeepPartial<T> = T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T;

/* Fallback profile used while /api/profile is loading or if it fails. */
const FALLBACK_PROFILE: BusinessProfile = {
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
    { name: "Carpet Cleaning",   min_price: 88,  description: "First 2 rooms $88 (oversized/L-shaped or living+dining combo counts as 2 rooms). Whole house (5 rooms + hall) $188. Additional room $45; single room $50 (only with another service). Stairs $4 each, landings $8 each, walk-in closets $20-25, halls from $20. Area/Oriental rugs $0.75/sq ft (cleaned on site). High-rise fee +$30.", active: true },
    { name: "Upholstery",        min_price: 50,  description: "Sofa $95, loveseat $88, chair $50, all 3 pieces $188. L-shaped sectional $145-175; U-shaped sectional $175-300 (by size/# seats). Ottoman $30. Extra decorator pillows $10 each (sofa pillows free). Dining chairs $15-25.", active: true },
    { name: "Air Duct Cleaning", min_price: 199, description: "Whole house up to 10 vents $199; each additional vent $30. Permanent electrostatic air filter $125. EPA-approved method.", active: true },
    { name: "Dryer Vent",        min_price: 99,  description: "Through side wall $99; through roof $149. $50 off when done together with air duct cleaning.", active: true },
    { name: "Tile & Grout",      min_price: 99,  description: "First 2 areas (or 200 sq ft) $99; additional $0.50/sq ft. Grout color sealing $1.00/sq ft. Shower walls & floors $1.50/sq ft.", active: true },
    { name: "Mattress",          min_price: 69,  description: "Price is per side - Twin $69, Queen $89, King $109. 2nd side 50% off the first side.", active: true },
    { name: "Wood Floor",        min_price: 150, description: "Sandless clean, seal & refinish $1.50/sq ft (includes cleaning + 2 coats sealant). Extra gloss coat +$0.25/sq ft.", active: true },
  ],
  pricing_notes: [
    "Minimum charge is $88 on every job - quote it whenever a request would total less. All pricing includes moving small furniture. Prices are estimates; odd sizes or conditions may need an on-site look or a photo for a firm quote.",
    "Add-on fees: move large furniture +$50 (no entertainment centers, china cabinets, dressers, or beds); hazardous cleanup (blood/vomit/feces) +$50; pick up mess on floors +$50; last-minute (within 24 hr) cancellation/re-book fee $50.",
    "Bundles & deals: $50 off dryer vent cleaning when done with air duct cleaning; whole-house carpet (5 rooms + hall) $188.",
    "Why us: oxygenated citrus method, all-natural & pet-friendly, carpets dry in about 1 hour, no hidden fees, and highly rated on Google.",
  ],
  technicians: [
    { name: "Isiah Ervin",     pay_rate: 40 },
    { name: "Peyton Mueters",  pay_rate: 40 },
    { name: "Anthony Rodgers", pay_rate: 40 },
    { name: "Evan Hoover",     pay_rate: 40 },
  ],
  pay_rate_per_job: 40,
  booking_url: "https://book.housecallpro.com/book/Tulsa-Kwik-Dry-Total-Cleaning",
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
    housecallpro:  { api_key: "",      connected: true,  last_sync: null },
    quickbooks:    {                   connected: true,  last_sync: null },
    whatsapp:      { twilio_sid: "",   twilio_token: "", twilio_number: "", last_sync: null },
    google_places: { api_key: "",      last_sync: null },
  },
};

interface ProfileContextValue {
  profile: BusinessProfile;
  updateProfile: (patch: DeepPartial<BusinessProfile>) => Promise<BusinessProfile>;
  refresh: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextValue>({
  profile: FALLBACK_PROFILE,
  updateProfile: async () => FALLBACK_PROFILE,
  refresh: async () => {},
});

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<BusinessProfile>(FALLBACK_PROFILE);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/profile");
      if (!r.ok) return;
      const p = (await r.json()) as BusinessProfile;
      setProfile(p);
    } catch { /* keep current */ }
  }, []);

  const updateProfile = useCallback(async (patch: DeepPartial<BusinessProfile>) => {
    const r = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!r.ok) throw new Error(`PATCH /api/profile failed: ${r.status}`);
    const next = (await r.json()) as BusinessProfile;
    setProfile(next);
    return next;
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  /* Expose brand colors as CSS vars so any component can pick them up. */
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--brand-primary",   profile.primary_color);
    root.style.setProperty("--brand-secondary", profile.secondary_color);
  }, [profile.primary_color, profile.secondary_color]);

  return (
    <ProfileContext.Provider value={{ profile, updateProfile, refresh }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile(): BusinessProfile {
  return useContext(ProfileContext).profile;
}

export function useProfileActions() {
  const { updateProfile, refresh } = useContext(ProfileContext);
  return { updateProfile, refresh };
}

/* ─── Helper: build a reusable business-context block for AI system prompts ─── */
export function buildBusinessContext(p: BusinessProfile): string {
  const servicesBlock = p.services
    .filter((s) => s.active)
    .map((s) => `- ${s.name}: ${s.description}`)
    .join("\n");
  const areaBlock = p.service_area.join(", ");
  const techBlock = p.technicians.map((t) => t.name).join(", ");
  const notesBlock =
    p.pricing_notes && p.pricing_notes.length > 0
      ? `\n\nPRICING NOTES & POLICIES:\n${p.pricing_notes.map((n) => `- ${n}`).join("\n")}`
      : "";

  return `BUSINESS: ${p.business_name} (${p.industry})
PHONE: ${p.phone}
EMAIL: ${p.email}
WEBSITE: ${p.website}
ADDRESS: ${p.address}
HOURS: ${p.hours}
BOOKING: ${p.booking_url}

SERVICES & PRICING:
${servicesBlock}${notesBlock}

SERVICE AREA: ${areaBlock}

TECHNICIANS: ${techBlock}`;
}

/* ─── Helper: build Ryder's customer-reply draft system prompt ───────────────
   Shared by the Dispatch and Inbox draft flows so Ryder always answers from
   the live profile data (edits to the profile update Ryder with no code
   change) and follows the same accuracy guardrails + approval flow.        */
export function buildRyderDraftSystem(p: BusinessProfile): string {
  const ryderName = p.agents.customer_faq;
  return `You are ${ryderName}, the customer-facing AI assistant for ${p.business_name}. You draft replies to inbound WhatsApp/SMS customer messages. Every reply you write is a DRAFT that a human reviews and approves before it is sent.

${buildBusinessContext(p)}

ACCURACY GUARDRAILS — follow strictly:
- Only state prices, services, service-area towns, hours, and policies that appear in the data above. NEVER invent or estimate a price, service, or policy that isn't listed.
- The minimum charge is $88 — quote it whenever a request would total less than that.
- For size- or condition-dependent jobs (large sectionals, per-sq-ft work, unusual stains), give the listed range, then say a firm quote may need a quick look or a photo, and offer the booking link or phone.
- For anything outside this data (warranty edge cases, specific scheduling/availability, complaints, or anything that commits the business), do NOT guess — point the customer to booking at ${p.booking_url} or call ${p.phone}; a human will review your draft before it sends.
- Mention relevant bundles when it's natural (e.g. $50 off dryer vent with air duct cleaning; whole-house carpet $188).

TONE: warm, neighborly, and concise (2–4 sentences) — like a helpful local, not a brochure.`;
}
