import type { DeepPartial, BusinessProfile } from "@/context/ProfileContext";

/* ── Inline SVG logos so demo mode works without uploaded assets ────────── */
function svgLogo(text: string, primary: string, secondary: string): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 96'>
    <defs>
      <linearGradient id='g' x1='0' x2='1' y1='0' y2='0'>
        <stop offset='0' stop-color='${primary}'/>
        <stop offset='1' stop-color='${secondary}'/>
      </linearGradient>
    </defs>
    <rect width='320' height='96' rx='14' fill='url(#g)'/>
    <text x='160' y='62' font-family='Inter, Arial, sans-serif' font-size='38' font-weight='800'
      text-anchor='middle' fill='white' letter-spacing='1'>${text}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/* ── Preset shape: the demo-relevant slice of the profile ──────────────── */
export interface DemoPreset {
  id: string;
  label: string;
  tagline: string;
  patch: DeepPartial<BusinessProfile>;
}

export const KWIKDRY_PRESET: DemoPreset = {
  id: "kwikdry",
  label: "Tulsa Kwik Dry (default)",
  tagline: "Carpet & Home Cleaning · Tulsa OK",
  patch: {
    business_name: "Tulsa Kwik Dry Total Cleaning",
    business_short_name: "Kwik Dry",
    industry: "Carpet & Home Cleaning",
    phone: "(918) 238-2986",
    email: "tulsakwikdry@gmail.com",
    website: "https://tulsakwikdry.com",
    address: "2430 W New Orleans St, Broken Arrow OK 74011",
    primary_color: "#2b4fac",
    secondary_color: "#3db54a",
    logo_url: "/kwikdry-logo.png",
    app_name: "Command Center",
    hours: "Monday\u2013Saturday 7am\u201310pm",
    timezone: "America/Chicago",
    service_area: [
      "Tulsa","Broken Arrow","Bixby","Jenks","Owasso","Sand Springs",
      "Claremore","Glenpool","Collinsville","Catoosa","Coweta","Sapulpa",
      "Skiatook","Wagoner",
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
    agents: {
      customer_faq: "Ryder",
      financial:    "Finn",
      dispatch:     "Dispatch",
      marketing:    "Scout",
      orchestrator: "Ask",
    },
  },
};

export const DEMO_PRESETS: DemoPreset[] = [
  {
    id: "comfortpro-hvac",
    label: "Comfort Pro HVAC",
    tagline: "Heating · Cooling · Air Quality · Dallas TX",
    patch: {
      business_name: "Comfort Pro Heating & Air",
      business_short_name: "Comfort Pro",
      industry: "HVAC",
      phone: "(214) 555-0142",
      email: "hello@comfortprohvac.com",
      website: "https://comfortprohvac.com",
      address: "8420 Stemmons Fwy, Dallas TX 75247",
      primary_color: "#0f4c81",
      secondary_color: "#f47b20",
      logo_url: svgLogo("COMFORT PRO", "#0f4c81", "#f47b20"),
      app_name: "Comfort HQ",
      hours: "Monday\u2013Friday 7am\u20137pm, Sat 8am\u20132pm",
      timezone: "America/Chicago",
      service_area: [
        "Dallas","Plano","Frisco","McKinney","Allen","Richardson",
        "Garland","Irving","Arlington","Grand Prairie","Mesquite",
      ],
      services: [
        { name: "AC Tune-Up",         min_price: 89,   description: "Full system inspection + cleaning $89",   active: true },
        { name: "AC Repair",          min_price: 149,  description: "Diagnostic $89, repairs from $149",       active: true },
        { name: "Furnace Repair",     min_price: 149,  description: "Heating diagnostic + repair from $149",   active: true },
        { name: "New System Install", min_price: 4800, description: "3-ton system installed from $4,800",      active: true },
        { name: "Duct Cleaning",      min_price: 349,  description: "Whole-home duct cleaning $349",           active: true },
        { name: "Indoor Air Quality", min_price: 599,  description: "UV + media filter package $599",          active: true },
      ],
      agents: {
        customer_faq: "Riley",
        financial:    "Hank",
        dispatch:     "Dispatch",
        marketing:    "Pulse",
        orchestrator: "Ask",
      },
    },
  },
  {
    id: "mainline-plumbing",
    label: "Mainline Plumbing & Drain",
    tagline: "Drain · Leaks · Water Heaters · Phoenix AZ",
    patch: {
      business_name: "Mainline Plumbing & Drain",
      business_short_name: "Mainline",
      industry: "Plumbing",
      phone: "(602) 555-0178",
      email: "service@mainlineplumb.com",
      website: "https://mainlineplumb.com",
      address: "2100 W Buckeye Rd, Phoenix AZ 85009",
      primary_color: "#1c3d6e",
      secondary_color: "#d62828",
      logo_url: svgLogo("MAINLINE", "#1c3d6e", "#d62828"),
      app_name: "Pipeline",
      hours: "24/7 Emergency Service",
      timezone: "America/Phoenix",
      service_area: [
        "Phoenix","Scottsdale","Tempe","Mesa","Chandler","Gilbert",
        "Glendale","Peoria","Surprise","Avondale","Goodyear",
      ],
      services: [
        { name: "Drain Cleaning",     min_price: 99,   description: "Main line clear $99 (most homes)",        active: true },
        { name: "Leak Detection",     min_price: 149,  description: "Camera + electronic detection $149",      active: true },
        { name: "Water Heater Repair",min_price: 189,  description: "Repair or thermocouple swap from $189",   active: true },
        { name: "Water Heater Install",min_price: 1450,description: "40gal gas installed from $1,450",         active: true },
        { name: "Slab Leak Repair",   min_price: 1200, description: "Reroute or spot repair from $1,200",      active: true },
        { name: "Repipe",             min_price: 4500, description: "Whole-home PEX repipe from $4,500",       active: true },
      ],
      agents: {
        customer_faq: "Mac",
        financial:    "Hank",
        dispatch:     "Dispatch",
        marketing:    "Pulse",
        orchestrator: "Ask",
      },
    },
  },
  {
    id: "greenscape-lawn",
    label: "GreenScape Lawn & Landscape",
    tagline: "Mowing · Fertilization · Hedge · Atlanta GA",
    patch: {
      business_name: "GreenScape Lawn & Landscape",
      business_short_name: "GreenScape",
      industry: "Lawn Care & Landscaping",
      phone: "(404) 555-0193",
      email: "hello@greenscapeatl.com",
      website: "https://greenscapeatl.com",
      address: "1855 Howell Mill Rd NW, Atlanta GA 30318",
      primary_color: "#2e7d32",
      secondary_color: "#8d6e63",
      logo_url: svgLogo("GREENSCAPE", "#2e7d32", "#8d6e63"),
      app_name: "Growth HQ",
      hours: "Monday\u2013Saturday 7am\u20136pm",
      timezone: "America/New_York",
      service_area: [
        "Atlanta","Decatur","Marietta","Smyrna","Sandy Springs","Roswell",
        "Alpharetta","Brookhaven","Tucker","Dunwoody","East Point",
      ],
      services: [
        { name: "Weekly Mowing",      min_price: 45,  description: "Standard yard $45/visit",                  active: true },
        { name: "Fertilization Program",min_price: 65,description: "6-step seasonal program $65/visit",        active: true },
        { name: "Core Aeration",      min_price: 149, description: "Standard yard $149",                       active: true },
        { name: "Hedge Trimming",     min_price: 95,  description: "Per-hour $95 ($95 minimum)",               active: true },
        { name: "Leaf Cleanup",       min_price: 175, description: "Fall whole-yard from $175",                active: true },
        { name: "Mulch Install",      min_price: 65,  description: "$65/yard installed",                       active: true },
      ],
      agents: {
        customer_faq: "Sage",
        financial:    "Hank",
        dispatch:     "Dispatch",
        marketing:    "Pulse",
        orchestrator: "Ask",
      },
    },
  },
  {
    id: "summit-roofing",
    label: "Summit Roofing Co.",
    tagline: "Inspection · Repair · Replacement · Denver CO",
    patch: {
      business_name: "Summit Roofing Co.",
      business_short_name: "Summit",
      industry: "Roofing",
      phone: "(303) 555-0164",
      email: "office@summitroofco.com",
      website: "https://summitroofco.com",
      address: "1320 S Broadway, Denver CO 80210",
      primary_color: "#37474f",
      secondary_color: "#c0392b",
      logo_url: svgLogo("SUMMIT", "#37474f", "#c0392b"),
      app_name: "Peak HQ",
      hours: "Monday\u2013Friday 7am\u20136pm",
      timezone: "America/Denver",
      service_area: [
        "Denver","Aurora","Lakewood","Thornton","Arvada","Westminster",
        "Centennial","Highlands Ranch","Boulder","Littleton","Englewood",
      ],
      services: [
        { name: "Free Roof Inspection",min_price: 0,    description: "Full inspection + photo report (free)",  active: true },
        { name: "Roof Repair",         min_price: 350,  description: "Minor leak / shingle repair from $350",  active: true },
        { name: "Full Replacement",    min_price: 9500, description: "Asphalt shingle replacement from $9,500",active: true },
        { name: "Hail Damage Claim",   min_price: 0,    description: "Insurance claim assistance (no cost)",   active: true },
        { name: "Gutter Replacement",  min_price: 1800, description: "Aluminum 5\" K-style from $1,800",       active: true },
        { name: "Skylight Install",    min_price: 1450, description: "Velux fixed install from $1,450",        active: true },
      ],
      agents: {
        customer_faq: "Ridge",
        financial:    "Hank",
        dispatch:     "Dispatch",
        marketing:    "Pulse",
        orchestrator: "Ask",
      },
    },
  },
];
