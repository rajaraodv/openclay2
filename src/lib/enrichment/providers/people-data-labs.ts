import type {
  EnrichmentProvider,
  EnrichmentInput,
  EnrichmentResult,
} from "../types";

// People Data Labs API: https://api.peopledatalabs.com
// Endpoint: GET /v5/person/enrich
// Headers: X-Api-Key: <api_key>
// Params: email, profile (linkedin_url), first_name, last_name, company

export const peopleDataLabsProvider: EnrichmentProvider = {
  id: "people-data-labs",
  name: "People Data Labs",
  category: "people",
  fieldsProvided: [
    "email",
    "phone",
    "title",
    "company",
    "linkedin_url",
    "location",
    "skills",
    "education",
    "experience",
  ],
  defaultCreditCost: 1,
  rateLimitRPM: 600,

  async enrich(
    input: EnrichmentInput,
    apiKey: string,
  ): Promise<EnrichmentResult> {
    try {
      const hasInput =
        input.email || input.linkedinUrl || (input.firstName && input.lastName);
      if (!hasInput) {
        return {
          success: false,
          data: null,
          source: "people-data-labs",
          confidence: 0,
          creditsConsumed: 0,
          rawResponse: {
            error:
              "At least email, linkedinUrl, or firstName+lastName required for PDL enrichment",
          },
        };
      }

      // TODO: Implement actual API call
      // GET https://api.peopledatalabs.com/v5/person/enrich
      // Headers: { "X-Api-Key": apiKey, "Accept": "application/json" }
      // Params: { email, profile: linkedinUrl, first_name, last_name, company }
      const _endpoint = "https://api.peopledatalabs.com/v5/person/enrich";
      void _endpoint;
      void apiKey;

      return {
        success: false,
        data: null,
        source: "people-data-labs",
        confidence: 0,
        creditsConsumed: 0,
        rawResponse: {
          error: "People Data Labs provider not yet implemented",
        },
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        source: "people-data-labs",
        confidence: 0,
        creditsConsumed: 0,
        rawResponse: {
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  },

  async validateApiKey(apiKey: string): Promise<boolean> {
    // TODO: Implement key validation
    // GET https://api.peopledatalabs.com/v5/person/enrich?email=test@test.com
    // Headers: { "X-Api-Key": apiKey }
    // A 401 means invalid, 200 or 404 means valid key
    void apiKey;
    return false;
  },
};
