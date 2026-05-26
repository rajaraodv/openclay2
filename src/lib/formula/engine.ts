// ── Formula Evaluation Engine ───────────────────────────────────────

import { formulaFunctions } from "./functions";

// ── Template Reference Pattern ──────────────────────────────────────
const REFERENCE_PATTERN = /\{\{([^}]+)\}\}/g;

// ── Result Types ────────────────────────────────────────────────────

export interface FormulaResult {
  success: boolean;
  result?: any;
  error?: string;
}

// ── Template Replacement ────────────────────────────────────────────

/**
 * Replace all {{ColumnName}} references in an expression with actual
 * values from the context. Cross-table references like {{Table.Column}}
 * are supported — the context key should be "Table.Column".
 */
function replaceReferences(
  expression: string,
  context: Record<string, any>,
): string {
  return expression.replace(REFERENCE_PATTERN, (_match, ref: string) => {
    const key = ref.trim();
    const value = context[key];

    if (value === undefined || value === null) {
      return "null";
    }

    if (typeof value === "string") {
      // Escape backslashes and quotes for safe embedding in JS
      const escaped = value
        .replace(/\\/g, "\\\\")
        .replace(/"/g, '\\"')
        .replace(/\n/g, "\\n")
        .replace(/\r/g, "\\r");
      return `"${escaped}"`;
    }

    if (typeof value === "object") {
      return JSON.stringify(value);
    }

    return String(value);
  });
}

// ── Safe Math Scope ─────────────────────────────────────────────────

const MATH_SCOPE: Record<string, any> = {
  // Expose all Math methods
  abs: Math.abs,
  ceil: Math.ceil,
  floor: Math.floor,
  round: Math.round,
  sqrt: Math.sqrt,
  pow: Math.pow,
  log: Math.log,
  log10: Math.log10,
  log2: Math.log2,
  exp: Math.exp,
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  PI: Math.PI,
  E: Math.E,
  min: Math.min,
  max: Math.max,
  random: Math.random,
  sign: Math.sign,
  trunc: Math.trunc,
};

// ── Blocked Patterns ────────────────────────────────────────────────
// Prevent access to dangerous globals in formula expressions

const BLOCKED_PATTERNS = [
  /\bprocess\b/,
  /\brequire\b/,
  /\bimport\b/,
  /\bglobalThis\b/,
  /\b__dirname\b/,
  /\b__filename\b/,
  /\beval\b/,
  /\bFunction\b/,
  /\bsetTimeout\b/,
  /\bsetInterval\b/,
  /\bfetch\b/,
  /\bXMLHttpRequest\b/,
  /\bWebSocket\b/,
  /\bconstructor\b/,
  /\bprototype\b/,
  /\b__proto__\b/,
];

function validateExpression(expression: string): string | null {
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(expression)) {
      return `Expression contains blocked pattern: ${pattern.source}`;
    }
  }
  return null;
}

// ── Formula Evaluation ──────────────────────────────────────────────

/**
 * Evaluate a formula expression safely using the Function constructor
 * with a restricted scope.
 *
 * Available in scope:
 * - All built-in formula functions (CONCAT, IF, SUM, etc.)
 * - All Math methods (abs, ceil, floor, etc.)
 * - Common date helpers
 * - Row values via {{ColumnName}} references
 *
 * NOT available:
 * - process, require, import, eval, fetch, setTimeout, etc.
 */
export function evaluateFormula(
  expression: string,
  context: Record<string, any>,
): FormulaResult {
  try {
    // Replace template references with actual values
    const resolvedExpression = replaceReferences(expression, context);

    // Validate the resolved expression for dangerous patterns
    const validationError = validateExpression(resolvedExpression);
    if (validationError) {
      return { success: false, error: validationError };
    }

    // Build the sandbox scope: formula functions + math + context values
    const scope: Record<string, any> = {
      ...MATH_SCOPE,
      ...formulaFunctions,
      // Provide context values directly (for cases where users reference
      // column values without template syntax)
      ...context,
      // Utilities
      JSON: { parse: JSON.parse, stringify: JSON.stringify },
      String,
      Number,
      Boolean,
      Array,
      Object: { keys: Object.keys, values: Object.values, entries: Object.entries },
      Date,
      parseInt,
      parseFloat,
      isNaN,
      isFinite,
      encodeURIComponent,
      decodeURIComponent,
    };

    // Build parameter names and values for the Function constructor
    const paramNames = Object.keys(scope);
    const paramValues = Object.values(scope);

    // Create a sandboxed function. The function body returns the expression result.
    // Using "use strict" to prevent accidental global leaks.
    const fn = new Function(
      ...paramNames,
      `"use strict"; return (${resolvedExpression});`,
    );

    const result = fn(...paramValues);

    return { success: true, result };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Formula evaluation error: ${message}` };
  }
}

/**
 * Evaluate a condition expression and return a boolean.
 * Used for "only_run_if" conditions on columns.
 *
 * Examples:
 *   - "{{Email}} !== null"
 *   - "IS_EMAIL({{Email}}) && !IS_EMPTY({{Company}})"
 *   - "{{Status}} === 'active'"
 */
export function evaluateCondition(
  expression: string,
  context: Record<string, any>,
): boolean {
  const result = evaluateFormula(expression, context);

  if (!result.success) {
    // If condition evaluation fails, default to false (don't run)
    return false;
  }

  return Boolean(result.result);
}
