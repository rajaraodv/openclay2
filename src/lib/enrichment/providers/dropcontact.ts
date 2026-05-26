import type {
  EnrichmentProvider,
  EnrichmentInput,
  EnrichmentResult,
} from "../types";

// Dropcontact API: https://api.dropcontact.io
// Endpoint: POST /batch (enrichment), GET /batch/:request_id (results)
// Headers: X-Access-Token: <api_key>, Content-Type: application/json
// Body: { "data": [{ "first_name": "...", "last_name": "...", "company": "..." }], "siren": true }

export const dropcontactProvider: EnrichmentProvider = {
  id: "dropcontact",
  name: "Dropcontact",
  category: "email",
  fieldsProvided: [
    "email",
    "email_qualification",
    "phone",
    "job_title",
    "civility",
    "company_siren",
    "company_website",
  ],
  defaultCreditCost: 1,
  rateLimitRPM: 120,

  async enrich(
    input: EnrichmentInput,
    apiKey: string,
  ): Promise<EnrichmentResult> {
    try {
      if (!input.firstName || !input.lastName) {
        return {
          success: false,
          data: null,
          source: "dropcontact",
          confidence: 0,
          creditsConsumed: 0,
          rawResponse: {
            error:
              "firstName and lastName are required for Dropcontact enrichment",
          },
        };
      }

      // TODO: Implement actual API call
      // Step 1: POST https://api.dropcontact.io/batch
      // Headers: { "X-Access-Token": apiKey, "Content-Type": "application/json" }
      // Body: {
      //   "data": [{
      //     "first_name": input.firstName,
      //     "last_name": input.lastName,
      //     "company": input.companyName ?? input.domain,
      //     "website": input.domain
      //   }],
      //   "siren": true,
      //   "language": "en"
      // }
      // Response: { "request_id": "...", "success": true }
      //
      // Step 2: Poll GET https://api.dropcontact.io/batch/:request_id
      // Headers: { "X-Access-Token": apiKey }
      // Until response.success is true and response.data is populated
      const _endpoint = "https://api.dropcontact.io/batch";
      void _endpoint;
      void apiKey;

      return {
        success: false,
        data: null,
        source: "dropcontact",
        confidence: 0,
        creditsConsumed: 0,
        rawResponse: { error: "Dropcontact provider not yet implemented" },
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        source: "dropcontact",
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
    // POST https://api.dropcontact.io/batch with minimal test data
    // Headers: { "X-Access-Token": apiKey, "Content-Type": "application/json" }
    // 401 = invalid key
    void apiKey;
    return false;
  },
};
