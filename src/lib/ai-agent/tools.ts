// ── AI Agent Tools ──────────────────────────────────────────────────
// Tool definitions for the AI research agent using Vercel AI SDK + Zod.

import { tool } from "ai";
import { z } from "zod";

// ── Web Search Tool ─────────────────────────────────────────────────

export const webSearch = tool({
  description:
    "Search the web for information about a person, company, or topic. " +
    "Returns a list of relevant results with titles, URLs, and snippets.",
  inputSchema: z.object({
    query: z.string().describe("The search query to execute"),
  }),
  execute: async ({ query }) => {
    // Try Exa API first if key is available
    const exaApiKey = process.env.EXA_API_KEY;
    if (exaApiKey) {
      return await searchWithExa(query, exaApiKey);
    }

    // Fallback: Serper API
    const serperApiKey = process.env.SERPER_API_KEY;
    if (serperApiKey) {
      return await searchWithSerper(query, serperApiKey);
    }

    // Last resort: return empty results with a note
    return {
      results: [],
      note: "No search API key configured. Set EXA_API_KEY or SERPER_API_KEY.",
    };
  },
});

async function searchWithExa(
  query: string,
  apiKey: string,
): Promise<{ results: SearchResult[] }> {
  const response = await fetch("https://api.exa.ai/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      query,
      numResults: 10,
      useAutoprompt: true,
      type: "auto",
    }),
  });

  if (!response.ok) {
    throw new Error(`Exa search failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return {
    results: (data.results ?? []).map((r: any) => ({
      title: r.title ?? "",
      url: r.url ?? "",
      snippet: r.text?.slice(0, 300) ?? r.highlights?.[0] ?? "",
    })),
  };
}

async function searchWithSerper(
  query: string,
  apiKey: string,
): Promise<{ results: SearchResult[] }> {
  const response = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": apiKey,
    },
    body: JSON.stringify({ q: query, num: 10 }),
  });

  if (!response.ok) {
    throw new Error(`Serper search failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return {
    results: (data.organic ?? []).map((r: any) => ({
      title: r.title ?? "",
      url: r.link ?? "",
      snippet: r.snippet ?? "",
    })),
  };
}

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

// ── Web Scrape Tool ─────────────────────────────────────────────────

export const webScrape = tool({
  description:
    "Fetch a web page and extract its text content. " +
    "Useful for reading articles, company pages, LinkedIn profiles, etc.",
  inputSchema: z.object({
    url: z.string().url().describe("The URL to fetch and extract text from"),
  }),
  execute: async ({ url }) => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; OpenClay/1.0; +https://openclay.dev)",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        signal: controller.signal,
        redirect: "follow",
      });

      clearTimeout(timeout);

      if (!response.ok) {
        return {
          title: "",
          text: "",
          links: [],
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const html = await response.text();

      // Extract title
      const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const title = titleMatch
        ? titleMatch[1].replace(/\s+/g, " ").trim()
        : "";

      // Extract text content by stripping HTML tags
      const text = extractTextFromHtml(html);

      // Extract links
      const links = extractLinksFromHtml(html, url);

      return {
        title,
        text: text.slice(0, 10000), // Limit to 10k chars
        links: links.slice(0, 50), // Limit to 50 links
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        title: "",
        text: "",
        links: [],
        error: `Failed to fetch URL: ${message}`,
      };
    }
  },
});

function extractTextFromHtml(html: string): string {
  // Remove scripts, styles, and comments
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");

  // Replace block-level elements with newlines
  text = text.replace(/<\/?(?:div|p|br|hr|h[1-6]|li|tr|td|th|blockquote|pre|section|article|header|footer|nav|aside|main)[^>]*>/gi, "\n");

  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, "");

  // Decode common HTML entities
  text = text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");

  // Normalize whitespace
  text = text
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 0)
    .join("\n");

  return text;
}

function extractLinksFromHtml(html: string, baseUrl: string): string[] {
  const linkRegex = /<a[^>]+href="([^"]+)"/gi;
  const links: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(html)) !== null) {
    try {
      const href = match[1];
      // Skip anchors, javascript, and mailto
      if (href.startsWith("#") || href.startsWith("javascript:") || href.startsWith("mailto:")) {
        continue;
      }
      const absoluteUrl = new URL(href, baseUrl).href;
      if (!links.includes(absoluteUrl)) {
        links.push(absoluteUrl);
      }
    } catch {
      // Skip invalid URLs
    }
  }

  return links;
}

// ── Extract Data Tool ───────────────────────────────────────────────

export const extractData = tool({
  description:
    "Extract structured data from raw text based on a list of field names. " +
    "Analyzes the text and pulls out values matching the requested fields.",
  inputSchema: z.object({
    text: z.string().describe("The raw text to extract data from"),
    fields: z
      .array(z.string())
      .describe(
        "List of field names to extract (e.g. ['company_name', 'employee_count', 'industry'])",
      ),
  }),
  execute: async ({ text, fields }) => {
    // Pattern-based extraction for common field types
    const extracted: Record<string, any> = {};

    for (const field of fields) {
      extracted[field] = extractFieldFromText(text, field);
    }

    return extracted;
  },
});

function extractFieldFromText(text: string, field: string): any {
  const lower = field.toLowerCase();
  const textLower = text.toLowerCase();

  // Email extraction
  if (lower.includes("email")) {
    const emailMatch = text.match(
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
    );
    return emailMatch ? emailMatch[0] : null;
  }

  // Phone extraction
  if (lower.includes("phone") || lower.includes("tel")) {
    const phoneMatch = text.match(
      /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/,
    );
    return phoneMatch ? phoneMatch[0] : null;
  }

  // URL extraction
  if (lower.includes("url") || lower.includes("website") || lower.includes("link")) {
    const urlMatch = text.match(
      /https?:\/\/[^\s<>"{}|\\^`[\]]+/,
    );
    return urlMatch ? urlMatch[0] : null;
  }

  // Number / count extraction
  if (
    lower.includes("count") ||
    lower.includes("number") ||
    lower.includes("size") ||
    lower.includes("revenue") ||
    lower.includes("funding")
  ) {
    // Look for numbers near the field name in text
    const fieldWords = lower.split("_").join("|");
    const pattern = new RegExp(
      `(?:${fieldWords})\\s*[:.]?\\s*([\\d,]+\\.?\\d*)`,
      "i",
    );
    const match = text.match(pattern);
    if (match) {
      const numStr = match[1].replace(/,/g, "");
      const num = parseFloat(numStr);
      return isNaN(num) ? match[1] : num;
    }

    // Also check for patterns like "$1.5B", "1,500 employees"
    const moneyMatch = text.match(/\$[\d,.]+[BMKbmk]?/);
    if (moneyMatch && (lower.includes("revenue") || lower.includes("funding"))) {
      return moneyMatch[0];
    }
  }

  // Year extraction
  if (lower.includes("year") || lower.includes("founded") || lower.includes("date")) {
    const yearMatch = text.match(/\b(19|20)\d{2}\b/);
    return yearMatch ? parseInt(yearMatch[0], 10) : null;
  }

  // Generic: try to find the field name as a label in the text
  const fieldLabel = field.replace(/_/g, " ");
  const labelPattern = new RegExp(
    `${fieldLabel}\\s*[:.]\\s*([^\\n,;]+)`,
    "i",
  );
  const labelMatch = text.match(labelPattern);
  if (labelMatch) {
    return labelMatch[1].trim();
  }

  // Check for the field name near any value in the text
  const fieldIndex = textLower.indexOf(fieldLabel);
  if (fieldIndex !== -1) {
    // Extract the next 100 chars after the field name
    const snippet = text.slice(fieldIndex + fieldLabel.length, fieldIndex + fieldLabel.length + 100);
    const cleaned = snippet.replace(/^[\s:.-]+/, "").split(/[.\n]/)[0].trim();
    if (cleaned.length > 0 && cleaned.length < 200) {
      return cleaned;
    }
  }

  return null;
}

// ── Tool Set Export ─────────────────────────────────────────────────

export const agentTools = {
  webSearch,
  webScrape,
  extractData,
};
