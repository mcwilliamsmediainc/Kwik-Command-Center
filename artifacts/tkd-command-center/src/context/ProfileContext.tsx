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
    { name: "Carpet Cleaning",   min_price: 88,  description: "First 2 rooms $88, whole house $188",      active: true },
    { name: "Upholstery",        min_price: 55,  description: "Chair $55, sofa $95, sectional $145-$300", active: true },
    { name: "Air Duct Cleaning", min_price: 199, description: "Up to 10 vents $199",                      active: true },
    { name: "Dryer Vent",        min_price: 99,  description: "Side wall $99, through roof $149",         active: true },
    { name: "Tile & Grout",      min_price: 99,  description: "First 2 areas $99",                        active: true },
    { name: "Mattress",          min_price: 69,  description: "Twin $69 to King $109",                    active: true },
    { name: "Wood Floor",        min_price: 150, description: "$1.50/sq ft",                              active: true },
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

  return `BUSINESS: ${p.business_name} (${p.industry})
PHONE: ${p.phone}
EMAIL: ${p.email}
WEBSITE: ${p.website}
ADDRESS: ${p.address}
HOURS: ${p.hours}
BOOKING: ${p.booking_url}

SERVICES & PRICING:
${servicesBlock}

SERVICE AREA: ${areaBlock}

TECHNICIANS: ${techBlock}`;
}
