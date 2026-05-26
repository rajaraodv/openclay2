import type {
  EnrichmentProvider,
  EnrichmentInput,
  EnrichmentResult,
} from "../types";

// Crunchbase API: https://api.crunchbase.com
// Endpoint: GET /api/v4/entities/organizations/:permalink
// Headers: X-cb-user-key: <api_key>
// Alternative: POST /api/v4/searches/organizations (search by domain)

export const crunchbaseProvider: EnrichmentProvider = {
  id: "crunchbase",
  name: "Crunchbase",
  category: "company",
  fieldsProvided: [
    "company_name",
    "short_description",
    "founded_on",
    "num_employees_enum",
    "total_funding",
    "last_funding_type",
    "last_funding_at",
    "num_funding_rounds",
    "investor_count",
    "categories",
    "location",
    "website",
    "linkedin",
    "ipo_status",
  ],
  defaultCreditCost: 1,
  rateLimitRPM: 200,

  async enrich(
    input: EnrichmentInput,
    apiKey: string,
  ): Promise<EnrichmentResult> {
    try {
      if (!input.domain && !input.companyName) {
        return {
          success: false,
          data: null,
          source: "crunchbase",
          confidence: 0,
          creditsConsumed: 0,
          rawResponse: {
            error:
              "domain or companyName required for Crunchbase enrichment",
          },
        };
      }

      // TODO: Implement actual API call
      // Option A: Search by domain
      // POST https://api.crunchbase.com/api/v4/searches/organizations
      // Headers: { "X-cb-user-key": apiKey, "Content-Type": "application/json" }
      // Body: {
      //   "field_ids": [
      //     "identifier", "short_description", "founded_on", "num_employees_enum",
      //     "funding_total", "last_funding_type", "last_funding_at",
      //     "num_funding_rounds", "investor_count", "categories",
      //     "location_identifiers", "website_url", "linkedin", "ipo_status"
      //   ],
      //   "query": [{ "type": "predicate", "field_id": "website_url", "operator_id": "contains", "values": [input.domain] }],
      //   "limit": 1
      // }
      //
      // Option B: Direct lookup by permalink
      // GET https://api.crunchbase.com/api/v4/entities/organizations/:permalink?field_ids=...
      // Headers: { "X-cb-user-key": apiKey }
      const _endpoint =
        "https://api.crunchbase.com/api/v4/searches/organizations";
      void _endpoint;
      void apiKey;

      return {
        success: false,
        data: null,
        source: "crunchbase",
        confidence: 0,
        creditsConsumed: 0,
        rawResponse: { error: "Crunchbase provider not yet implemented" },
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        source: "crunchbase",
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
    // POST https://api.crunchbase.com/api/v4/searches/organizations
    // Headers: { "X-cb-user-key": apiKey }
    // with minimal search body; 401 = invalid key
    void apiKey;
    return false;
  },
};
