import type {
  EnrichmentProvider,
  EnrichmentInput,
  EnrichmentResult,
} from "../types";

// Lusha API: https://api.lusha.com
// Endpoint: GET /person
// Headers: api_key: <api_key>
// Params: firstName, lastName, company OR property: linkedin (linkedinUrl)

export const lushaProvider: EnrichmentProvider = {
  id: "lusha",
  name: "Lusha",
  category: "people",
  fieldsProvided: [
    "email",
    "phone",
    "title",
    "company",
    "full_name",
  ],
  defaultCreditCost: 1,
  rateLimitRPM: 300,

  async enrich(
    input: EnrichmentInput,
    apiKey: string,
  ): Promise<EnrichmentResult> {
    try {
      const hasNameCompany =
        input.firstName && input.lastName && input.companyName;
      if (!hasNameCompany && !input.linkedinUrl) {
        return {
          success: false,
          data: null,
          source: "lusha",
          confidence: 0,
          creditsConsumed: 0,
          rawResponse: {
            error:
              "firstName+lastName+companyName or linkedinUrl required for Lusha",
          },
        };
      }

      // TODO: Implement actual API call
      // GET https://api.lusha.com/person
      // Headers: { "api_key": apiKey }
      // Params (name-based): { firstName, lastName, company }
      // Params (linkedin-based): { property: "linkedin", linkedinUrl }
      const _endpoint = "https://api.lusha.com/person";
      void _endpoint;
      void apiKey;

      return {
        success: false,
        data: null,
        source: "lusha",
        confidence: 0,
        creditsConsumed: 0,
        rawResponse: { error: "Lusha provider not yet implemented" },
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        source: "lusha",
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
    // GET https://api.lusha.com/person?firstName=test&lastName=test&company=test
    // Headers: { "api_key": apiKey }
    // 401 = invalid key
    void apiKey;
    return false;
  },
};
