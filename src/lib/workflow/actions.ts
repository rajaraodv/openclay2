// ── Action Executors ────────────────────────────────────────────────
// Each action type replaces {{ColumnName}} tokens with actual row values.

import type { CellResult } from "./types";

// ── Token Replacement ───────────────────────────────────────────────

/**
 * Replace {{ColumnName}} tokens in a string with actual values from rowData.
 */
function injectRowValues(template: string, rowData: Record<string, any>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_match, ref: string) => {
    const key = ref.trim();
    const value = rowData[key];
    if (value === undefined || value === null) return "";
    return typeof value === "object" ? JSON.stringify(value) : String(value);
  });
}

/**
 * Recursively replace tokens in an object's string values.
 */
function injectRowValuesDeep(
  obj: Record<string, any>,
  rowData: Record<string, any>,
): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      result[key] = injectRowValues(value, rowData);
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      result[key] = injectRowValuesDeep(value, rowData);
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        typeof item === "string"
          ? injectRowValues(item, rowData)
          : typeof item === "object" && item !== null
            ? injectRowValuesDeep(item, rowData)
            : item,
      );
    } else {
      result[key] = value;
    }
  }
  return result;
}

// ── HTTP Action ─────────────────────────────────────────────────────

export interface HttpActionConfig {
  url: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  body?: string | Record<string, any>;
  timeoutMs?: number;
  /** JSONPath-like key to extract from the response body */
  responseMapping?: Record<string, string>;
}

export async function executeHttpAction(
  config: HttpActionConfig,
  rowData: Record<string, any>,
): Promise<CellResult> {
  try {
    const url = injectRowValues(config.url, rowData);

    const headers: Record<string, string> = {};
    if (config.headers) {
      for (const [key, value] of Object.entries(config.headers)) {
        headers[key] = injectRowValues(value, rowData);
      }
    }

    let body: string | undefined;
    if (config.body && config.method !== "GET") {
      if (typeof config.body === "string") {
        body = injectRowValues(config.body, rowData);
      } else {
        const injected = injectRowValuesDeep(config.body, rowData);
        body = JSON.stringify(injected);
        if (!headers["Content-Type"]) {
          headers["Content-Type"] = "application/json";
        }
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      config.timeoutMs ?? 30000,
    );

    const response = await fetch(url, {
      method: config.method,
      headers,
      body,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    let responseData: any;
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${typeof responseData === "string" ? responseData.slice(0, 500) : JSON.stringify(responseData).slice(0, 500)}`,
        rawValue: responseData,
      };
    }

    // Apply response mapping if configured
    let value = responseData;
    if (config.responseMapping && typeof responseData === "object") {
      value = {};
      for (const [outputField, path] of Object.entries(config.responseMapping)) {
        (value as Record<string, any>)[outputField] = getNestedValue(responseData, path);
      }
    }

    return {
      success: true,
      value,
      rawValue: responseData,
      source: "http_action",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `HTTP action failed: ${message}`,
    };
  }
}

// ── Webhook Action ──────────────────────────────────────────────────

export interface WebhookActionConfig {
  url: string;
  /** Additional static payload fields to include alongside row data */
  payload?: Record<string, any>;
  headers?: Record<string, string>;
  secret?: string;
}

export async function executeWebhookAction(
  config: WebhookActionConfig,
  rowData: Record<string, any>,
): Promise<CellResult> {
  try {
    const url = injectRowValues(config.url, rowData);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (config.headers) {
      for (const [key, value] of Object.entries(config.headers)) {
        headers[key] = injectRowValues(value, rowData);
      }
    }

    // Build webhook payload: row data + any extra payload fields
    const payload: Record<string, any> = {
      timestamp: new Date().toISOString(),
      data: rowData,
    };

    if (config.payload) {
      payload.extra = injectRowValuesDeep(config.payload, rowData);
    }

    // Sign the payload if a secret is provided
    if (config.secret) {
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(config.secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
      );
      const signature = await crypto.subtle.sign(
        "HMAC",
        key,
        encoder.encode(JSON.stringify(payload)),
      );
      headers["X-Webhook-Signature"] = arrayBufferToHex(signature);
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text();
      return {
        success: false,
        error: `Webhook returned ${response.status}: ${body.slice(0, 500)}`,
      };
    }

    return {
      success: true,
      value: { delivered: true, statusCode: response.status },
      source: "webhook_action",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `Webhook action failed: ${message}`,
    };
  }
}

// ── Slack Action ────────────────────────────────────────────────────

export interface SlackActionConfig {
  webhookUrl: string;
  message: string;
  channel?: string;
  username?: string;
  iconEmoji?: string;
  /** Template for Slack Block Kit blocks (JSON string with {{}} tokens) */
  blocks?: string;
}

export async function executeSlackAction(
  config: SlackActionConfig,
  rowData: Record<string, any>,
): Promise<CellResult> {
  try {
    const webhookUrl = injectRowValues(config.webhookUrl, rowData);
    const message = injectRowValues(config.message, rowData);

    const payload: Record<string, any> = {
      text: message,
    };

    if (config.channel) {
      payload.channel = injectRowValues(config.channel, rowData);
    }
    if (config.username) {
      payload.username = config.username;
    }
    if (config.iconEmoji) {
      payload.icon_emoji = config.iconEmoji;
    }

    // Support Block Kit for rich formatting
    if (config.blocks) {
      try {
        const blocksStr = injectRowValues(config.blocks, rowData);
        payload.blocks = JSON.parse(blocksStr);
      } catch {
        // If blocks parsing fails, fall back to plain text
      }
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text();
      return {
        success: false,
        error: `Slack webhook returned ${response.status}: ${body}`,
      };
    }

    return {
      success: true,
      value: { sent: true, message },
      source: "slack_action",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `Slack action failed: ${message}`,
    };
  }
}

// ── Write Table Action ──────────────────────────────────────────────

export interface WriteTableActionConfig {
  targetTableId: string;
  /** Maps source column names to target column names */
  fieldMapping: Record<string, string>;
  /** How to handle duplicates: skip, update, or create */
  onDuplicate?: "skip" | "update" | "create";
  /** Column name in the target table to check for duplicates */
  deduplicateOn?: string;
}

export async function executeWriteTableAction(
  config: WriteTableActionConfig,
  rowData: Record<string, any>,
): Promise<CellResult> {
  try {
    // Build the target row data from the field mapping
    const targetRow: Record<string, any> = {};
    for (const [sourceCol, targetCol] of Object.entries(config.fieldMapping)) {
      const value = rowData[sourceCol];
      targetRow[targetCol] = value ?? null;
    }

    // This is a placeholder for the actual database write.
    // In production, this would be called with a database connection
    // injected by the executor. The actual implementation would:
    // 1. Check for duplicates if deduplicateOn is set
    // 2. Insert or update the row in the target table
    // 3. Return the new row ID

    return {
      success: true,
      value: {
        targetTableId: config.targetTableId,
        data: targetRow,
        action: config.onDuplicate ?? "create",
      },
      source: "write_table_action",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `Write table action failed: ${message}`,
    };
  }
}

// ── Utilities ───────────────────────────────────────────────────────

/**
 * Get a nested value from an object using a dot-separated path.
 * e.g. getNestedValue({ a: { b: 1 } }, "a.b") => 1
 */
function getNestedValue(obj: any, path: string): any {
  const parts = path.split(".");
  let current = obj;
  for (const part of parts) {
    if (current == null) return undefined;
    // Support array indexing: "items[0]"
    const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
    if (arrayMatch) {
      current = current[arrayMatch[1]];
      if (Array.isArray(current)) {
        current = current[parseInt(arrayMatch[2], 10)];
      } else {
        return undefined;
      }
    } else {
      current = current[part];
    }
  }
  return current;
}

function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
