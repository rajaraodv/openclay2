import type {
  EnrichmentProvider,
  EnrichmentInput,
  EnrichmentResult,
} from "../types";

const HUNTER_API_BASE = "https://api.hunter.io";

interface HunterEmailFinderResponse {
  data?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    score?: number;
    domain?: string;
    position?: string;
    company?: string;
    sources?: Array<{
      domain?: string;
      uri?: string;
      extracted_on?: string;
    }>;
    verification?: {
      date?: string;
      status?: string;
    };
  };
  errors?: Array<{ id: string; code: number; details: string }>;
}

export const hunterProvider: EnrichmentProvider = {
  id: "hunter",
  name: "Hunter.io",
  category: "email",
  fieldsProvided: ["email", "email_score", "email_verification_status"],
  defaultCreditCost: 1,
  rateLimitRPM: 180,

  async enrich(
    input: EnrichmentInput,
    apiKey: string,
  ): Promise<EnrichmentResult> {
    try {
      if (!input.domain) {
        return {
          success: false,
          data: null,
          source: "hunter",
          confidence: 0,
          creditsConsumed: 0,
          rawResponse: { error: "domain is required for Hunter email finder" },
        };
      }

      if (!input.firstName || !input.lastName) {
        return {
          success: false,
          data: null,
          source: "hunter",
          confidence: 0,
          creditsConsumed: 0,
          rawResponse: {
            error:
              "firstName and lastName are required for Hunter email finder",
          },
        };
      }

      const params = new URLSearchParams({
        domain: input.domain,
        first_name: input.firstName,
        last_name: input.lastName,
        api_key: apiKey,
      });

      const response = await fetch(
        `${HUNTER_API_BASE}/v2/email-finder?${params.toString()}`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
        },
      );

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        return {
          success: false,
          data: null,
          source: "hunter",
          confidence: 0,
          creditsConsumed: response.status === 429 ? 0 : 1,
          rawResponse: { status: response.status, error: errorText },
        };
      }

      const json = (await response.json()) as HunterEmailFinderResponse;

      if (json.errors?.length || !json.data?.email) {
        return {
          success: false,
          data: null,
          source: "hunter",
          confidence: 0,
          creditsConsumed: 1,
          rawResponse: json,
        };
      }

      const score = json.data.score ?? 0;

      return {
        success: true,
        data: {
          email: json.data.email,
          emailScore: score,
          emailVerificationStatus: json.data.verification?.status ?? null,
          firstName: json.data.first_name ?? null,
          lastName: json.data.last_name ?? null,
          position: json.data.position ?? null,
          company: json.data.company ?? null,
          domain: json.data.domain ?? null,
          sourcesCount: json.data.sources?.length ?? 0,
        },
        source: "hunter",
        confidence: score / 100,
        creditsConsumed: 1,
        rawResponse: json,
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        source: "hunter",
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
      const params = new URLSearchParams({ api_key: apiKey });
      const response = await fetch(
        `${HUNTER_API_BASE}/v2/account?${params.toString()}`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
        },
      );
      return response.ok;
    } catch {
      return false;
    }
  },
};
