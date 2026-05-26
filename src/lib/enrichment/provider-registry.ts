import type { EnrichmentProvider, ProviderCategory } from "./types";
import {
  apolloProvider,
  hunterProvider,
  clearbitProvider,
  zerobounceProvider,
  prospeoProvider,
  peopleDataLabsProvider,
  lushaProvider,
  dropcontactProvider,
  crunchbaseProvider,
  builtwithProvider,
} from "./providers";

class ProviderRegistry {
  private providers = new Map<string, EnrichmentProvider>();

  register(provider: EnrichmentProvider): void {
    if (this.providers.has(provider.id)) {
      throw new Error(
        `Provider "${provider.id}" is already registered. ` +
          "Use a unique provider id.",
      );
    }
    this.providers.set(provider.id, provider);
  }

  get(id: string): EnrichmentProvider | undefined {
    return this.providers.get(id);
  }

  getByCategory(category: ProviderCategory): EnrichmentProvider[] {
    const result: EnrichmentProvider[] = [];
    for (const provider of this.providers.values()) {
      if (provider.category === category) {
        result.push(provider);
      }
    }
    return result;
  }

  getAll(): EnrichmentProvider[] {
    return Array.from(this.providers.values());
  }
}

// ── Singleton Instance ───────────────────────────────────────────────

export const providerRegistry = new ProviderRegistry();

// Pre-register all Wave 1 providers
providerRegistry.register(apolloProvider);
providerRegistry.register(hunterProvider);
providerRegistry.register(clearbitProvider);
providerRegistry.register(zerobounceProvider);
providerRegistry.register(prospeoProvider);
providerRegistry.register(peopleDataLabsProvider);
providerRegistry.register(lushaProvider);
providerRegistry.register(dropcontactProvider);
providerRegistry.register(crunchbaseProvider);
providerRegistry.register(builtwithProvider);
