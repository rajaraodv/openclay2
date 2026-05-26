import type {
  EnrichmentInput,
  EnrichmentResult,
  WaterfallConfig,
} from "./types";
import { providerRegistry } from "./provider-registry";

export interface WaterfallContext {
  /** Map of provider id -> decrypted API key */
  apiKeys: Record<string, string>;
  /** Minimum confidence threshold to accept a result (0-1). Defaults to 0.5. */
  minConfidence?: number;
}

export interface WaterfallOutcome {
  result: EnrichmentResult | null;
  attempts: WaterfallAttempt[];
  totalCreditsConsumed: number;
}

export interface WaterfallAttempt {
  providerId: string;
  result: EnrichmentResult;
  verified?: boolean;
  skippedReason?: string;
}

/**
 * Run the waterfall enrichment strategy:
 * 1. Try each provider in order
 * 2. If a result is returned and a verification provider is configured,
 *    verify the result (e.g. email verification)
 * 3. If verified (or no verifier configured), return the result
 * 4. If verification fails or no result, continue to next provider
 * 5. Return the best result found, or null if nothing worked
 */
export async function runWaterfall(
  config: WaterfallConfig,
  input: EnrichmentInput,
  context: WaterfallContext,
): Promise<WaterfallOutcome> {
  const attempts: WaterfallAttempt[] = [];
  let totalCreditsConsumed = 0;
  let bestResult: EnrichmentResult | null = null;
  const minConfidence = context.minConfidence ?? 0.5;

  for (const providerId of config.providerOrder) {
    const provider = providerRegistry.get(providerId);
    if (!provider) {
      attempts.push({
        providerId,
        result: {
          success: false,
          data: null,
          source: providerId,
          confidence: 0,
          creditsConsumed: 0,
        },
        skippedReason: `Provider "${providerId}" not found in registry`,
      });
      continue;
    }

    const apiKey = context.apiKeys[providerId];
    if (!apiKey) {
      attempts.push({
        providerId,
        result: {
          success: false,
          data: null,
          source: providerId,
          confidence: 0,
          creditsConsumed: 0,
        },
        skippedReason: `No API key configured for "${providerId}"`,
      });
      continue;
    }

    // Call the provider
    let result: EnrichmentResult;
    try {
      result = await provider.enrich(input, apiKey);
    } catch (error) {
      result = {
        success: false,
        data: null,
        source: providerId,
        confidence: 0,
        creditsConsumed: 0,
        rawResponse: {
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }

    totalCreditsConsumed += result.creditsConsumed;

    // If the provider didn't return usable data, record and continue
    if (!result.success || !result.data) {
      attempts.push({ providerId, result });
      continue;
    }

    // Track the best result seen so far (highest confidence)
    if (!bestResult || result.confidence > bestResult.confidence) {
      bestResult = result;
    }

    // If there's a verification provider and the result contains an email, verify it
    if (config.verificationProvider && result.data["email"]) {
      const verified = await verifyResult(
        config.verificationProvider,
        result,
        context,
      );
      totalCreditsConsumed += verified.creditsConsumed;

      if (verified.isValid) {
        attempts.push({ providerId, result, verified: true });
        // Verified result -- return immediately
        return {
          result,
          attempts,
          totalCreditsConsumed,
        };
      }

      // Verification failed, continue to next provider
      attempts.push({ providerId, result, verified: false });
      continue;
    }

    // No verification configured: accept if above minimum confidence
    if (result.confidence >= minConfidence) {
      attempts.push({ providerId, result });
      return {
        result,
        attempts,
        totalCreditsConsumed,
      };
    }

    // Below confidence threshold, keep looking
    attempts.push({ providerId, result });
  }

  // Exhausted all providers -- return the best result we found (may be null)
  return {
    result: bestResult,
    attempts,
    totalCreditsConsumed,
  };
}

// ── Verification Helper ──────────────────────────────────────────────

interface VerificationOutcome {
  isValid: boolean;
  creditsConsumed: number;
}

async function verifyResult(
  verificationProviderId: string,
  enrichmentResult: EnrichmentResult,
  context: WaterfallContext,
): Promise<VerificationOutcome> {
  const verifier = providerRegistry.get(verificationProviderId);
  if (!verifier) {
    // If no verifier is available, treat the result as valid
    return { isValid: true, creditsConsumed: 0 };
  }

  const apiKey = context.apiKeys[verificationProviderId];
  if (!apiKey) {
    return { isValid: true, creditsConsumed: 0 };
  }

  try {
    const verificationInput: EnrichmentInput = {
      email: enrichmentResult.data?.["email"] as string | undefined,
    };

    const verificationResult = await verifier.enrich(verificationInput, apiKey);

    const status = verificationResult.data?.["status"];
    const isValid = status === "valid" || status === "catch-all";

    return {
      isValid,
      creditsConsumed: verificationResult.creditsConsumed,
    };
  } catch {
    // On verification error, be lenient and treat as valid
    return { isValid: true, creditsConsumed: 0 };
  }
}
