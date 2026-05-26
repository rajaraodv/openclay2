import type {
  EnrichmentProvider,
  EnrichmentInput,
  EnrichmentResult,
} from "../types";

const CLEARBIT_API_BASE = "https://company.clearbit.com";

interface ClearbitCompanyResponse {
  id?: string;
  name?: string;
  legalName?: string;
  domain?: string;
  domainAliases?: string[];
  url?: string;
  logo?: string;
  description?: string;
  category?: {
    sector?: string;
    industryGroup?: string;
    industry?: string;
    subIndustry?: string;
  };
  metrics?: {
    raised?: number;
    alexaUsRank?: number;
    alexaGlobalRank?: number;
    employees?: number;
    employeesRange?: string;
    marketCap?: number;
    annualRevenue?: number;
    estimatedAnnualRevenue?: string;
  };
  tech?: string[];
  geo?: {
    streetNumber?: string;
    streetName?: string;
    subPremise?: string;
    city?: string;
    postalCode?: string;
    state?: string;
    stateCode?: string;
    country?: string;
    countryCode?: string;
    lat?: number;
    lng?: number;
  };
  foundedYear?: number;
  twitter?: { handle?: string; followers?: number };
  linkedin?: { handle?: string };
  facebook?: { handle?: string };
  error?: { message?: string };
}

export const clearbitProvider: EnrichmentProvider = {
  id: "clearbit",
  name: "Clearbit",
  category: "company",
  fieldsProvided: [
    "company_name",
    "industry",
    "employee_count",
    "revenue",
    "tech_stack",
    "location",
    "description",
    "logo",
    "founded_year",
    "social_profiles",
  ],
  defaultCreditCost: 1,
  rateLimitRPM: 600,

  async enrich(
    input: EnrichmentInput,
    apiKey: string,
  ): Promise<EnrichmentResult> {
    try {
      if (!input.domain) {
        return {
          success: false,
          data: null,
          source: "clearbit",
          confidence: 0,
          creditsConsumed: 0,
          rawResponse: { error: "domain is required for Clearbit enrichment" },
        };
      }

      const params = new URLSearchParams({ domain: input.domain });

      const response = await fetch(
        `${CLEARBIT_API_BASE}/v2/companies/find?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: "application/json",
          },
        },
      );

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        return {
          success: false,
          data: null,
          source: "clearbit",
          confidence: 0,
          creditsConsumed: response.status === 429 ? 0 : 1,
          rawResponse: { status: response.status, error: errorText },
        };
      }

      const json = (await response.json()) as ClearbitCompanyResponse;

      if (json.error) {
        return {
          success: false,
          data: null,
          source: "clearbit",
          confidence: 0,
          creditsConsumed: 1,
          rawResponse: json,
        };
      }

      return {
        success: true,
        data: {
          companyName: json.name ?? null,
          legalName: json.legalName ?? null,
          domain: json.domain ?? null,
          logo: json.logo ?? null,
          description: json.description ?? null,
          industry: json.category?.industry ?? null,
          sector: json.category?.sector ?? null,
          subIndustry: json.category?.subIndustry ?? null,
          employeeCount: json.metrics?.employees ?? null,
          employeeRange: json.metrics?.employeesRange ?? null,
          annualRevenue: json.metrics?.annualRevenue ?? null,
          estimatedAnnualRevenue:
            json.metrics?.estimatedAnnualRevenue ?? null,
          marketCap: json.metrics?.marketCap ?? null,
          raised: json.metrics?.raised ?? null,
          techStack: json.tech ?? [],
          city: json.geo?.city ?? null,
          state: json.geo?.state ?? null,
          country: json.geo?.country ?? null,
          postalCode: json.geo?.postalCode ?? null,
          streetAddress: [json.geo?.streetNumber, json.geo?.streetName]
            .filter(Boolean)
            .join(" ") || null,
          lat: json.geo?.lat ?? null,
          lng: json.geo?.lng ?? null,
          foundedYear: json.foundedYear ?? null,
          twitterHandle: json.twitter?.handle ?? null,
          twitterFollowers: json.twitter?.followers ?? null,
          linkedinHandle: json.linkedin?.handle ?? null,
          facebookHandle: json.facebook?.handle ?? null,
        },
        source: "clearbit",
        confidence: 0.9,
        creditsConsumed: 1,
        rawResponse: json,
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        source: "clearbit",
        confidence: 0,
        creditsConsumed: 0,
        rawResponse: {
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  },

  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      // Use a known domain to test the key
      const params = new URLSearchParams({ domain: "clearbit.com" });
      const response = await fetch(
        `${CLEARBIT_API_BASE}/v2/companies/find?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: "application/json",
          },
        },
      );
      // 401/403 means invalid key, anything else means key is valid
      return response.status !== 401 && response.status !== 403;
    } catch {
      return false;
    }
  },
};
