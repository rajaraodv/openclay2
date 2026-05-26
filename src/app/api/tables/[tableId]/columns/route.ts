import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { columns } from "@/db/schema/tables";
import { eq, asc, max } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const dataTypeValues = [
  "text",
  "url",
  "number",
  "date",
  "select",
  "multi_select",
  "checkbox",
  "currency",
  "email",
  "image",
  "assigned_to",
] as const;

const columnTypeValues = [
  "manual",
  "enrichment",
  "formula",
  "ai_agent",
  "action",
] as const;

const createColumnSchema = z.object({
  name: z.string().min(1).max(255),
  data_type: z.enum(dataTypeValues).default("text"),
  column_type: z.enum(columnTypeValues).default("manual"),
  config: z.record(z.string(), z.unknown()).optional(),
});

// ---------------------------------------------------------------------------
// GET  /api/tables/[tableId]/columns — list columns ordered by position
// ---------------------------------------------------------------------------

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tableId: string }> },
) {
  try {
    const { tableId } = await params;

    const result = await db
      .select()
      .from(columns)
      .where(eq(columns.tableId, tableId))
      .orderBy(asc(columns.position));

    return Response.json(result);
  } catch (error) {
    console.error("GET /api/tables/[tableId]/columns error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST /api/tables/[tableId]/columns — add a column, position auto-set to end
// ---------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tableId: string }> },
) {
  try {
    const { tableId } = await params;

    const body = await request.json();
    const parsed = createColumnSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { name, data_type, column_type, config } = parsed.data;

    // Determine next position
    const [maxPos] = await db
      .select({ maxPosition: max(columns.position) })
      .from(columns)
      .where(eq(columns.tableId, tableId));

    const nextPosition = (maxPos?.maxPosition ?? -1) + 1;

    const [column] = await db
      .insert(columns)
      .values({
        tableId,
        name,
        dataType: data_type,
        columnType: column_type,
        position: nextPosition,
        config: config ?? {},
      })
      .returning();

    return Response.json(column, { status: 201 });
  } catch (error) {
    console.error("POST /api/tables/[tableId]/columns error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
