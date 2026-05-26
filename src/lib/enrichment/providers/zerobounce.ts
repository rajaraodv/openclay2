import type {
  EnrichmentProvider,
  EnrichmentInput,
  EnrichmentResult,
} from "../types";

const ZEROBOUNCE_API_BASE = "https://api.zerobounce.net";

interface ZeroBounceValidateResponse {
  address?: string;
  status?:
    | "valid"
    | "invalid"
    | "catch-all"
    | "unknown"
    | "spamtrap"
    | "abuse"
    | "do_not_mail";
  sub_status?: string;
  free_email?: boolean;
  did_you_mean?: string;
  account?: string;
  domain?: string;
  domain_age_days?: string;
  smtp_provider?: string;
  mx_found?: string;
  mx_record?: string;
  firstname?: string;
  lastname?: string;
  gender?: string;
  country?: string;
  region?: string;
  city?: string;
  zipcode?: string;
  processed_at?: string;
  error?: string;
}

export const zerobounceProvider: EnrichmentProvider = {
  id: "zerobounce",
  name: "ZeroBounce",
  category: "verification",
  fieldsProvided: [
    "email_status",
    "email_sub_status",
    "is_free_email",
    "smtp_provider",
    "mx_record",
    "did_you_mean",
  ],
  defaultCreditCost: 1,
  rateLimitRPM: 600,

  async enrich(
    input: EnrichmentInput,
    apiKey: string,
  ): Promise<EnrichmentResult> {
    try {
      if (!input.email) {
        return {
          success: false,
          data: null,
          source: "zerobounce",
          confidence: 0,
          creditsConsumed: 0,
          rawResponse: {
            error: "email is required for ZeroBounce verification",
          },
        };
      }

      const params = new URLSearchParams({
        api_key: apiKey,
        email: input.email,
        ip_address: "", // optional, can be empty
      });

      const response = await fetch(
        `${ZEROBOUNCE_API_BASE}/v2/validate?${params.toString()}`,
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
          source: "zerobounce",
          confidence: 0,
          creditsConsumed: response.status === 429 ? 0 : 1,
          rawResponse: { status: response.status, error: errorText },
        };
      }

      const json = (await response.json()) as ZeroBounceValidateResponse;

      if (json.error) {
        return {
          success: false,
          data: null,
          source: "zerobounce",
          confidence: 0,
          creditsConsumed: 1,
          rawResponse: json,
        };
      }

      const status = json.status ?? "unknown";
      const isValid = status === "valid";
      const isCatchAll = status === "catch-all";

      let confidence = 0;
      if (isValid) confidence = 0.99;
      else if (isCatchAll) confidence = 0.6;
      else if (status === "unknown") confidence = 0.3;

      return {
        success: true,
        data: {
          email: json.address ?? input.email,
          status,
          subStatus: json.sub_status ?? null,
          isValid,
          isCatchAll,
          isFreeEmail: json.free_email ?? null,
          didYouMean: json.did_you_mean || null,
          account: json.account ?? null,
          domain: json.domain ?? null,
          domainAgeDays: json.domain_age_days ?? null,
          smtpProvider: json.smtp_provider ?? null,
          mxFound: json.mx_found ?? null,
          mxRecord: json.mx_record ?? null,
          firstName: json.firstname ?? null,
          lastName: json.lastname ?? null,
          gender: json.gender ?? null,
          country: json.country ?? null,
          region: json.region ?? null,
          city: json.city ?? null,
          zipcode: json.zipcode ?? null,
          processedAt: json.processed_at ?? null,
        },
        source: "zerobounce",
        confidence,
        creditsConsumed: 1,
        rawResponse: json,
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        source: "zerobounce",
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
        `${ZEROBOUNCE_API_BASE}/v2/getcredits?${params.toString()}`,
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
