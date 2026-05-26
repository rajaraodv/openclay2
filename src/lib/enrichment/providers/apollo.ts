import type {
  EnrichmentProvider,
  EnrichmentInput,
  EnrichmentResult,
} from "../types";

const APOLLO_API_BASE = "https://api.apollo.io/v1";

interface ApolloPersonMatch {
  id?: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  email?: string;
  email_status?: string;
  phone_numbers?: Array<{ raw_number?: string; sanitized_number?: string }>;
  title?: string;
  headline?: string;
  linkedin_url?: string;
  organization?: {
    name?: string;
    website_url?: string;
    industry?: string;
    estimated_num_employees?: number;
  };
  city?: string;
  state?: string;
  country?: string;
}

interface ApolloMatchResponse {
  person?: ApolloPersonMatch;
  status?: string;
}

export const apolloProvider: EnrichmentProvider = {
  id: "apollo",
  name: "Apollo.io",
  category: "people",
  fieldsProvided: [
    "email",
    "phone",
    "title",
    "company",
    "linkedin_url",
    "headline",
    "location",
  ],
  defaultCreditCost: 1,
  rateLimitRPM: 300,

  async enrich(
    input: EnrichmentInput,
    apiKey: string,
  ): Promise<EnrichmentResult> {
    try {
      const body: Record<string, string> = {};

      if (input.email) body.email = input.email;
      if (input.firstName) body.first_name = input.firstName;
      if (input.lastName) body.last_name = input.lastName;
      if (input.domain) body.organization_name = input.domain;
      if (input.linkedinUrl) body.linkedin_url = input.linkedinUrl;

      const response = await fetch(`${APOLLO_API_BASE}/people/match`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
          "X-Api-Key": apiKey,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        return {
          success: false,
          data: null,
          source: "apollo",
          confidence: 0,
          creditsConsumed: response.status === 429 ? 0 : 1,
          rawResponse: { status: response.status, error: errorText },
        };
      }

      const json = (await response.json()) as ApolloMatchResponse;
      const person = json.person;

      if (!person) {
        return {
          success: false,
          data: null,
          source: "apollo",
          confidence: 0,
          creditsConsumed: 1,
          rawResponse: json,
        };
      }

      const phone = person.phone_numbers?.[0];

      return {
        success: true,
        data: {
          firstName: person.first_name ?? null,
          lastName: person.last_name ?? null,
          fullName: person.name ?? null,
          email: person.email ?? null,
          emailStatus: person.email_status ?? null,
          phone: phone?.sanitized_number ?? phone?.raw_number ?? null,
          title: person.title ?? null,
          headline: person.headline ?? null,
          linkedinUrl: person.linkedin_url ?? null,
          company: person.organization?.name ?? null,
          companyWebsite: person.organization?.website_url ?? null,
          companyIndustry: person.organization?.industry ?? null,
          companySize: person.organization?.estimated_num_employees ?? null,
          city: person.city ?? null,
          state: person.state ?? null,
          country: person.country ?? null,
        },
        source: "apollo",
        confidence: person.email_status === "verified" ? 0.95 : 0.75,
        creditsConsumed: 1,
        rawResponse: json,
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        source: "apollo",
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
      const response = await fetch(`${APOLLO_API_BASE}/auth/health`, {
        method: "GET",
        headers: {
          "X-Api-Key": apiKey,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  },
};
