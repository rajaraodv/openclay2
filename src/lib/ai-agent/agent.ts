// ── AI Research Agent ───────────────────────────────────────────────
// Uses Vercel AI SDK for multi-model support with tool calling.

import { generateText, streamText, stepCountIs, type ToolSet } from "ai";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import type { AIAgentBehavior } from "@/lib/workflow/types";
import { agentTools, webSearch, webScrape, extractData } from "./tools";

// ── Result Types ────────────────────────────────────────────────────

export interface AgentSource {
  url: string;
  title: string;
  snippet?: string;
}

export interface AgentResult {
  success: boolean;
  output: Record<string, any>;
  sources: AgentSource[];
  confidence: number;
  reasoning?: string;
  tokensUsed?: number;
  error?: string;
}

// ── Model Router ────────────────────────────────────────────────────

/**
 * Map a model string to a Vercel AI SDK provider model.
 * Supports formats like:
 *   - "gpt-4o", "gpt-4o-mini" -> OpenAI
 *   - "claude-sonnet-4-20250514", "claude-3-5-haiku-20241022" -> Anthropic
 *   - "openai:gpt-4o" -> explicit provider prefix
 *   - "anthropic:claude-sonnet-4-20250514" -> explicit provider prefix
 */
function resolveModel(model: string) {
  // Explicit provider prefix
  if (model.startsWith("openai:")) {
    return openai(model.slice("openai:".length));
  }
  if (model.startsWith("anthropic:")) {
    return anthropic(model.slice("anthropic:".length));
  }

  // Auto-detect by model name
  if (model.startsWith("gpt-") || model.startsWith("o1") || model.startsWith("o3")) {
    return openai(model);
  }
  if (model.startsWith("claude-")) {
    return anthropic(model);
  }

  // Default to OpenAI
  return openai(model);
}

// ── Tool Selection ──────────────────────────────────────────────────

/**
 * Build the tool set based on the behavior config.
 * Users can specify which tools are available to the agent.
 */
function buildToolSet(config: AIAgentBehavior): ToolSet {
  const allTools: Record<string, typeof webSearch | typeof webScrape | typeof extractData> = {
    webSearch,
    webScrape,
    extractData,
  };

  if (!config.tools || config.tools.length === 0) {
    // Default: all tools available
    return agentTools;
  }

  const selected: ToolSet = {};
  for (const toolName of config.tools) {
    if (toolName in allTools) {
      selected[toolName] = allTools[toolName as keyof typeof allTools];
    }
  }

  return selected;
}

// ── System Prompt ───────────────────────────────────────────────────

function buildSystemPrompt(config: AIAgentBehavior, rowContext: Record<string, any>): string {
  return `You are a business research agent working inside OpenClay, a data enrichment platform. Your job is to research information about people, companies, and business topics, then return structured data.

## Instructions
${config.prompt}

## Context
You have access to the following data about the current row:
${Object.entries(rowContext)
  .map(([key, value]) => `- ${key}: ${value ?? "(empty)"}`)
  .join("\n")}

## Output Requirements
- Use the available tools to research and verify information.
- Always try to find primary sources (company websites, LinkedIn, official filings).
- Cross-reference information from multiple sources when possible.
- For each data point, note your confidence level.
- If you cannot find reliable information for a field, set it to null rather than guessing.
${
  config.outputSchema
    ? `
## Expected Output Schema
Return a JSON object matching this structure:
${JSON.stringify(config.outputSchema, null, 2)}
`
    : ""
}

## Response Format
Return your findings as a JSON object. Include a "_sources" array with URLs you referenced and a "_confidence" number (0.0 to 1.0) indicating overall confidence.`;
}

// ── Replace Context References ──────────────────────────────────────

function resolvePromptReferences(prompt: string, rowContext: Record<string, any>): string {
  return prompt.replace(/\{\{([^}]+)\}\}/g, (_match, ref: string) => {
    const key = ref.trim();
    const value = rowContext[key];
    return value != null ? String(value) : "";
  });
}

// ── Main Agent Runner ───────────────────────────────────────────────

/**
 * Run the AI research agent with the given configuration and row context.
 * Returns structured output with source citations and confidence scores.
 */
export async function runAgent(
  config: AIAgentBehavior,
  rowContext: Record<string, any>,
  apiKey?: string,
): Promise<AgentResult> {
  try {
    const model = resolveModel(config.model);
    const tools = buildToolSet(config);
    const systemPrompt = buildSystemPrompt(config, rowContext);
    const userPrompt = resolvePromptReferences(config.prompt, rowContext);

    // Set API keys if provided
    if (apiKey) {
      if (config.model.startsWith("gpt-") || config.model.startsWith("o1") || config.model.startsWith("o3") || config.model.startsWith("openai:")) {
        process.env.OPENAI_API_KEY = apiKey;
      } else if (config.model.startsWith("claude-") || config.model.startsWith("anthropic:")) {
        process.env.ANTHROPIC_API_KEY = apiKey;
      }
    }

    const result = await generateText({
      model,
      system: systemPrompt,
      prompt: userPrompt,
      tools,
      maxRetries: 2,
      // Allow the model to call tools up to 10 times
      stopWhen: stepCountIs(10),
    });

    // Parse the agent's final response
    const parsed = parseAgentOutput(result.text);

    return {
      success: true,
      output: parsed.data,
      sources: parsed.sources,
      confidence: parsed.confidence,
      reasoning: result.text,
      tokensUsed: result.usage
        ? (result.usage.inputTokens ?? 0) + (result.usage.outputTokens ?? 0)
        : undefined,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      output: {},
      sources: [],
      confidence: 0,
      error: `Agent execution failed: ${message}`,
    };
  }
}

// ── Streaming Agent Runner ──────────────────────────────────────────

/**
 * Run the AI research agent with streaming support for real-time UI updates.
 * Returns a ReadableStream that emits text chunks as they arrive.
 */
export function runAgentStream(
  config: AIAgentBehavior,
  rowContext: Record<string, any>,
  apiKey?: string,
): ReadableStream<string> {
  const model = resolveModel(config.model);
  const tools = buildToolSet(config);
  const systemPrompt = buildSystemPrompt(config, rowContext);
  const userPrompt = resolvePromptReferences(config.prompt, rowContext);

  // Set API keys if provided
  if (apiKey) {
    if (config.model.startsWith("gpt-") || config.model.startsWith("o1") || config.model.startsWith("o3") || config.model.startsWith("openai:")) {
      process.env.OPENAI_API_KEY = apiKey;
    } else if (config.model.startsWith("claude-") || config.model.startsWith("anthropic:")) {
      process.env.ANTHROPIC_API_KEY = apiKey;
    }
  }

  return new ReadableStream<string>({
    async start(controller) {
      try {
        const result = streamText({
          model,
          system: systemPrompt,
          prompt: userPrompt,
          tools,
          maxRetries: 2,
          stopWhen: stepCountIs(10),
        });

        for await (const chunk of result.textStream) {
          controller.enqueue(chunk);
        }

        controller.close();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        controller.enqueue(`\n\nError: ${message}`);
        controller.close();
      }
    },
  });
}

// ── Output Parser ───────────────────────────────────────────────────

interface ParsedAgentOutput {
  data: Record<string, any>;
  sources: AgentSource[];
  confidence: number;
}

function parseAgentOutput(text: string): ParsedAgentOutput {
  const defaultResult: ParsedAgentOutput = {
    data: {},
    sources: [],
    confidence: 0.5,
  };

  if (!text || text.trim() === "") {
    return defaultResult;
  }

  // Try to extract JSON from the response
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = jsonMatch ? jsonMatch[1].trim() : text.trim();

  try {
    // Attempt to parse the entire text or extracted JSON block
    let parsed: any;

    // Try parsing the extracted block first
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      // Try finding any JSON object in the text
      const objectMatch = text.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        parsed = JSON.parse(objectMatch[0]);
      } else {
        // No JSON found — treat the entire text as the output
        return {
          data: { result: text },
          sources: [],
          confidence: 0.5,
        };
      }
    }

    // Extract special fields
    const sources: AgentSource[] = [];
    let confidence = 0.5;

    if (parsed._sources && Array.isArray(parsed._sources)) {
      for (const source of parsed._sources) {
        if (typeof source === "string") {
          sources.push({ url: source, title: source });
        } else if (typeof source === "object" && source.url) {
          sources.push({
            url: source.url,
            title: source.title ?? source.url,
            snippet: source.snippet,
          });
        }
      }
    }

    if (typeof parsed._confidence === "number") {
      confidence = Math.max(0, Math.min(1, parsed._confidence));
    }

    // Remove internal fields from the data output
    const data = { ...parsed };
    delete data._sources;
    delete data._confidence;

    return { data, sources, confidence };
  } catch {
    // If all parsing fails, return the raw text
    return {
      data: { result: text },
      sources: [],
      confidence: 0.3,
    };
  }
}
