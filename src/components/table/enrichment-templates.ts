// ── Enrichment template & provider definitions ─────────────────────

export interface EnrichmentTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category:
    | "email"
    | "phone"
    | "company"
    | "people"
    | "technographic"
    | "social"
    | "ai";
  creditCostPerRow: number;
  providerCount: number;
  defaultProviders: string[];
}

export interface WaterfallProvider {
  id: string;
  name: string;
  icon: string;
  costPerRow: number;
  enabled: boolean;
}

export interface WaterfallColumnConfig {
  templateId: string;
  templateName: string;
  inputColumnId?: string;
  optimizedFor?: string;
  providers: WaterfallProvider[];
  estimatedCostPerRow: number;
  runOnSave: boolean;
}

// ── Provider catalog ────────────────────────────────────────────────
// Keyed by template id -> default provider list

export const PROVIDER_CATALOG: Record<string, WaterfallProvider[]> = {
  work_email: [
    { id: "findymail", name: "Findymail", icon: "FM", costPerRow: 2, enabled: true },
    { id: "hunter", name: "Hunter", icon: "HU", costPerRow: 2, enabled: true },
    { id: "prospeo", name: "Prospeo", icon: "PR", costPerRow: 2, enabled: true },
    { id: "kitt", name: "Kitt", icon: "KT", costPerRow: 1, enabled: true },
    { id: "datagma", name: "Datagma", icon: "DG", costPerRow: 2, enabled: true },
    { id: "wiza", name: "Wiza", icon: "WZ", costPerRow: 2, enabled: true },
    { id: "icypeas", name: "Icypeas", icon: "IC", costPerRow: 0.5, enabled: true },
  ],
  personal_email: [
    { id: "contactout", name: "ContactOut", icon: "CO", costPerRow: 3, enabled: true },
    { id: "apollo", name: "Apollo", icon: "AP", costPerRow: 1, enabled: true },
    { id: "lusha", name: "Lusha", icon: "LU", costPerRow: 2.5, enabled: true },
    { id: "datagma", name: "Datagma", icon: "DG", costPerRow: 2, enabled: true },
  ],
  phone_number: [
    { id: "lusha", name: "Lusha", icon: "LU", costPerRow: 3, enabled: true },
    { id: "apollo", name: "Apollo", icon: "AP", costPerRow: 1.5, enabled: true },
    { id: "contactout", name: "ContactOut", icon: "CO", costPerRow: 4, enabled: true },
    { id: "cognism", name: "Cognism", icon: "CG", costPerRow: 5, enabled: true },
    { id: "seamless", name: "Seamless.AI", icon: "SM", costPerRow: 2, enabled: true },
  ],
  company_domain: [
    { id: "clearbit", name: "Clearbit", icon: "CB", costPerRow: 1, enabled: true },
    { id: "hunter", name: "Hunter", icon: "HU", costPerRow: 0.5, enabled: true },
    { id: "brandfetch", name: "Brandfetch", icon: "BF", costPerRow: 1, enabled: true },
  ],
  website_traffic: [
    { id: "similarweb", name: "SimilarWeb", icon: "SW", costPerRow: 3, enabled: true },
    { id: "semrush", name: "SEMrush", icon: "SR", costPerRow: 2, enabled: true },
  ],
  company_funding: [
    { id: "crunchbase", name: "Crunchbase", icon: "CR", costPerRow: 5, enabled: true },
    { id: "pitchbook", name: "PitchBook", icon: "PB", costPerRow: 8, enabled: true },
    { id: "dealroom", name: "Dealroom", icon: "DR", costPerRow: 4, enabled: true },
  ],
  website_techstack: [
    { id: "builtwith", name: "BuiltWith", icon: "BW", costPerRow: 2, enabled: true },
    { id: "wappalyzer", name: "Wappalyzer", icon: "WP", costPerRow: 2.5, enabled: true },
  ],
  company_revenue: [
    { id: "zoominfo", name: "ZoomInfo", icon: "ZI", costPerRow: 8, enabled: true },
    { id: "dun_bradstreet", name: "Dun & Bradstreet", icon: "DB", costPerRow: 6, enabled: true },
    { id: "crunchbase", name: "Crunchbase", icon: "CR", costPerRow: 5, enabled: true },
  ],
  job_openings: [
    { id: "linkedin", name: "LinkedIn Jobs", icon: "LI", costPerRow: 2, enabled: true },
    { id: "indeed", name: "Indeed", icon: "IN", costPerRow: 1.5, enabled: true },
    { id: "builtin", name: "BuiltIn", icon: "BI", costPerRow: 3.5, enabled: true },
  ],
  linkedin_highlights: [
    { id: "proxycurl", name: "Proxycurl", icon: "PX", costPerRow: 0.5, enabled: true },
    { id: "contactout", name: "ContactOut", icon: "CO", costPerRow: 1, enabled: true },
  ],
  company_headcount: [
    { id: "linkedin", name: "LinkedIn", icon: "LI", costPerRow: 2, enabled: true },
    { id: "zoominfo", name: "ZoomInfo", icon: "ZI", costPerRow: 4, enabled: true },
    { id: "apollo", name: "Apollo", icon: "AP", costPerRow: 1, enabled: true },
  ],
  company_news: [
    { id: "google_news", name: "Google News", icon: "GN", costPerRow: 0.5, enabled: true },
    { id: "bing_news", name: "Bing News", icon: "BN", costPerRow: 0.5, enabled: true },
  ],
  person_title: [
    { id: "apollo", name: "Apollo", icon: "AP", costPerRow: 1, enabled: true },
    { id: "clearbit", name: "Clearbit", icon: "CB", costPerRow: 1.5, enabled: true },
    { id: "proxycurl", name: "Proxycurl", icon: "PX", costPerRow: 0.5, enabled: true },
  ],
  company_industry: [
    { id: "clearbit", name: "Clearbit", icon: "CB", costPerRow: 1, enabled: true },
    { id: "apollo", name: "Apollo", icon: "AP", costPerRow: 0.5, enabled: true },
    { id: "zoominfo", name: "ZoomInfo", icon: "ZI", costPerRow: 3, enabled: true },
  ],
  use_ai: [
    { id: "openai", name: "OpenAI GPT-4o", icon: "AI", costPerRow: 0.5, enabled: true },
    { id: "claude", name: "Claude Sonnet", icon: "AI", costPerRow: 0.5, enabled: true },
  ],
  social_profiles: [
    { id: "proxycurl", name: "Proxycurl", icon: "PX", costPerRow: 1, enabled: true },
    { id: "contactout", name: "ContactOut", icon: "CO", costPerRow: 2, enabled: true },
    { id: "apollo", name: "Apollo", icon: "AP", costPerRow: 0.5, enabled: true },
  ],
};

// ── Enrichment templates ────────────────────────────────────────────

export const ENRICHMENT_TEMPLATES: EnrichmentTemplate[] = [
  {
    id: "use_ai",
    name: "Use AI",
    description: "Use an AI model to generate or transform data.",
    icon: "sparkles",
    category: "ai",
    creditCostPerRow: 0.5,
    providerCount: 2,
    defaultProviders: ["openai", "claude"],
  },
  {
    id: "work_email",
    name: "Work Email",
    description: "Find a person's work email address.",
    icon: "mail",
    category: "email",
    creditCostPerRow: 3,
    providerCount: 7,
    defaultProviders: ["findymail", "hunter", "prospeo", "kitt", "datagma", "wiza", "icypeas"],
  },
  {
    id: "personal_email",
    name: "Personal Email",
    description: "Find a person's personal email address.",
    icon: "mail",
    category: "email",
    creditCostPerRow: 2.5,
    providerCount: 4,
    defaultProviders: ["contactout", "apollo", "lusha", "datagma"],
  },
  {
    id: "phone_number",
    name: "Phone Number",
    description: "Find a person's direct phone number.",
    icon: "phone",
    category: "phone",
    creditCostPerRow: 4,
    providerCount: 5,
    defaultProviders: ["lusha", "apollo", "contactout", "cognism", "seamless"],
  },
  {
    id: "company_domain",
    name: "Company Domain",
    description: "Find the website domain for a company.",
    icon: "globe",
    category: "company",
    creditCostPerRow: 1,
    providerCount: 3,
    defaultProviders: ["clearbit", "hunter", "brandfetch"],
  },
  {
    id: "website_traffic",
    name: "Website Traffic (Monthly)",
    description: "Get estimated monthly website traffic for a domain.",
    icon: "bar-chart-3",
    category: "company",
    creditCostPerRow: 2.5,
    providerCount: 2,
    defaultProviders: ["similarweb", "semrush"],
  },
  {
    id: "company_funding",
    name: "Company Latest Funding",
    description: "Find the latest funding round and amount for a company.",
    icon: "banknote",
    category: "company",
    creditCostPerRow: 5.8,
    providerCount: 3,
    defaultProviders: ["crunchbase", "pitchbook", "dealroom"],
  },
  {
    id: "website_techstack",
    name: "Website Techstack",
    description: "Identify the technologies used on a website.",
    icon: "layers",
    category: "technographic",
    creditCostPerRow: 2.3,
    providerCount: 2,
    defaultProviders: ["builtwith", "wappalyzer"],
  },
  {
    id: "company_revenue",
    name: "Company Revenue",
    description: "Estimate annual revenue for a company.",
    icon: "trending-up",
    category: "company",
    creditCostPerRow: 6.4,
    providerCount: 3,
    defaultProviders: ["zoominfo", "dun_bradstreet", "crunchbase"],
  },
  {
    id: "job_openings",
    name: "Company Job Openings",
    description: "Find current job openings at a company.",
    icon: "briefcase",
    category: "company",
    creditCostPerRow: 2.5,
    providerCount: 3,
    defaultProviders: ["linkedin", "indeed", "builtin"],
  },
  {
    id: "linkedin_highlights",
    name: "LinkedIn Profile Highlights",
    description: "Get key highlights from a person's LinkedIn profile.",
    icon: "user",
    category: "social",
    creditCostPerRow: 0.5,
    providerCount: 2,
    defaultProviders: ["proxycurl", "contactout"],
  },
  {
    id: "company_headcount",
    name: "Company Headcount",
    description: "Find the current employee count for a company.",
    icon: "users",
    category: "company",
    creditCostPerRow: 2,
    providerCount: 3,
    defaultProviders: ["linkedin", "zoominfo", "apollo"],
  },
  {
    id: "company_news",
    name: "Company News",
    description: "Find recent news articles about a company.",
    icon: "newspaper",
    category: "company",
    creditCostPerRow: 0.5,
    providerCount: 2,
    defaultProviders: ["google_news", "bing_news"],
  },
  {
    id: "person_title",
    name: "Person Job Title",
    description: "Find a person's current job title and company.",
    icon: "badge-check",
    category: "people",
    creditCostPerRow: 1,
    providerCount: 3,
    defaultProviders: ["apollo", "clearbit", "proxycurl"],
  },
  {
    id: "company_industry",
    name: "Company Industry",
    description: "Identify the industry classification for a company.",
    icon: "factory",
    category: "company",
    creditCostPerRow: 1,
    providerCount: 3,
    defaultProviders: ["clearbit", "apollo", "zoominfo"],
  },
  {
    id: "social_profiles",
    name: "Social Profiles",
    description: "Find social media profile URLs for a person.",
    icon: "share-2",
    category: "social",
    creditCostPerRow: 1,
    providerCount: 3,
    defaultProviders: ["proxycurl", "contactout", "apollo"],
  },
];
