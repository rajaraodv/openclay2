// ── Built-in Formula Functions ───────────────────────────────────────
// These are injected into the formula evaluation scope so users can call
// them directly in column formulas (e.g. =CONCAT({{FirstName}}, " ", {{LastName}}))

// ── String Functions ────────────────────────────────────────────────

function CONCAT(...args: any[]): string {
  return args.map((a) => (a == null ? "" : String(a))).join("");
}

function TRIM(val: any): string {
  return val == null ? "" : String(val).trim();
}

function UPPER(val: any): string {
  return val == null ? "" : String(val).toUpperCase();
}

function LOWER(val: any): string {
  return val == null ? "" : String(val).toLowerCase();
}

function SPLIT(val: any, separator: string): string[] {
  if (val == null) return [];
  return String(val).split(separator);
}

function REPLACE(val: any, search: string, replacement: string): string {
  if (val == null) return "";
  return String(val).replaceAll(search, replacement);
}

function EXTRACT_DOMAIN(url: any): string {
  if (url == null || String(url).trim() === "") return "";
  try {
    const str = String(url);
    // Add protocol if missing
    const normalized = str.includes("://") ? str : `https://${str}`;
    const parsed = new URL(normalized);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    // Fallback: try regex extraction
    const match = String(url).match(
      /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+(?:\.[a-zA-Z]{2,})+)/,
    );
    return match ? match[1] : "";
  }
}

function EXTRACT_EMAIL_DOMAIN(email: any): string {
  if (email == null || String(email).trim() === "") return "";
  const str = String(email);
  const atIndex = str.lastIndexOf("@");
  if (atIndex === -1) return "";
  return str.slice(atIndex + 1).toLowerCase();
}

// ── Logic Functions ─────────────────────────────────────────────────

function IF(condition: any, trueVal: any, falseVal: any): any {
  return condition ? trueVal : falseVal;
}

function AND(...args: any[]): boolean {
  return args.every(Boolean);
}

function OR(...args: any[]): boolean {
  return args.some(Boolean);
}

function NOT(val: any): boolean {
  return !val;
}

function COALESCE(...args: any[]): any {
  for (const arg of args) {
    if (arg != null && arg !== "" && arg !== undefined) {
      return arg;
    }
  }
  return null;
}

// ── Math Functions ──────────────────────────────────────────────────

function SUM(...args: any[]): number {
  const nums = args.flat().map(Number).filter((n) => !isNaN(n));
  return nums.reduce((a, b) => a + b, 0);
}

function AVG(...args: any[]): number {
  const nums = args.flat().map(Number).filter((n) => !isNaN(n));
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function MIN(...args: any[]): number {
  const nums = args.flat().map(Number).filter((n) => !isNaN(n));
  if (nums.length === 0) return 0;
  return Math.min(...nums);
}

function MAX(...args: any[]): number {
  const nums = args.flat().map(Number).filter((n) => !isNaN(n));
  if (nums.length === 0) return 0;
  return Math.max(...nums);
}

function ROUND(val: any, decimals: number = 0): number {
  const num = Number(val);
  if (isNaN(num)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round(num * factor) / factor;
}

function ABS(val: any): number {
  const num = Number(val);
  return isNaN(num) ? 0 : Math.abs(num);
}

// ── Date Functions ──────────────────────────────────────────────────

function TODAY(): string {
  return new Date().toISOString().split("T")[0];
}

function DAYS_BETWEEN(d1: any, d2: any): number {
  const date1 = new Date(d1);
  const date2 = new Date(d2);
  if (isNaN(date1.getTime()) || isNaN(date2.getTime())) return 0;
  const diffMs = Math.abs(date2.getTime() - date1.getTime());
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function FORMAT_DATE(date: any, format: string): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";

  const pad = (n: number) => String(n).padStart(2, "0");

  const tokens: Record<string, string> = {
    YYYY: String(d.getFullYear()),
    YY: String(d.getFullYear()).slice(-2),
    MM: pad(d.getMonth() + 1),
    DD: pad(d.getDate()),
    HH: pad(d.getHours()),
    mm: pad(d.getMinutes()),
    ss: pad(d.getSeconds()),
  };

  let result = format;
  for (const [token, value] of Object.entries(tokens)) {
    result = result.replaceAll(token, value);
  }

  return result;
}

// ── Lookup Functions ────────────────────────────────────────────────

/**
 * Cross-table lookup placeholder.
 * In production, this would query the database for matching rows.
 * The actual implementation requires a database connection that will be
 * injected at runtime by the formula engine.
 */
function VLOOKUP(
  _value: any,
  _tableId: string,
  _matchColumn: string,
  _returnColumn: string,
): any {
  // This is a placeholder. The actual implementation is injected by the
  // formula engine at runtime with database access. When called without
  // injection, it returns null to indicate no match.
  return null;
}

// ── Data Validation Functions ───────────────────────────────────────

function IS_EMPTY(val: any): boolean {
  if (val == null) return true;
  if (typeof val === "string") return val.trim() === "";
  if (Array.isArray(val)) return val.length === 0;
  if (typeof val === "object") return Object.keys(val).length === 0;
  return false;
}

function IS_EMAIL(val: any): boolean {
  if (val == null) return false;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(String(val));
}

function IS_URL(val: any): boolean {
  if (val == null) return false;
  try {
    const str = String(val);
    const normalized = str.includes("://") ? str : `https://${str}`;
    new URL(normalized);
    return true;
  } catch {
    return false;
  }
}

function IS_PHONE(val: any): boolean {
  if (val == null) return false;
  // Matches common phone number formats including international
  const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/;
  const str = String(val).replace(/\s/g, "");
  return phoneRegex.test(str) && str.replace(/\D/g, "").length >= 7;
}

// ── Export all functions ────────────────────────────────────────────

export const formulaFunctions = {
  // String
  CONCAT,
  TRIM,
  UPPER,
  LOWER,
  SPLIT,
  REPLACE,
  EXTRACT_DOMAIN,
  EXTRACT_EMAIL_DOMAIN,

  // Logic
  IF,
  AND,
  OR,
  NOT,
  COALESCE,

  // Math
  SUM,
  AVG,
  MIN,
  MAX,
  ROUND,
  ABS,

  // Date
  TODAY,
  DAYS_BETWEEN,
  FORMAT_DATE,

  // Lookup
  VLOOKUP,

  // Data validation
  IS_EMPTY,
  IS_EMAIL,
  IS_URL,
  IS_PHONE,
} as const;

export type FormulaFunctionName = keyof typeof formulaFunctions;
