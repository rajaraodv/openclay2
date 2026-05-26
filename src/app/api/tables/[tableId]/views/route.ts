import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { views } from "@/db/schema/tables";
import { eq } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const filterDefSchema = z.object({
  id: z.string(),
  columnId: z.string(),
  operator: z.enum([
    "contains",
    "not_contains",
    "equals",
    "not_equals",
    "starts_with",
    "ends_with",
    "gt",
    "gte",
    "lt",
    "lte",
    "is_empty",
    "is_not_empty",
  ]),
  value: z.string(),
});

const filterGroupSchema = z.object({
  logic: z.enum(["and", "or"]),
  filters: z.array(filterDefSchema),
});

const sortDefSchema = z.object({
  id: z.string(),
  columnId: z.string(),
  direction: z.enum(["asc", "desc"]),
});

const createViewSchema = z.object({
  name: z.string().min(1).max(255),
  filters: filterGroupSchema.optional(),
  sorts: z.array(sortDefSchema).optional(),
  hidden_columns: z.array(z.string()).optional(),
});

// ---------------------------------------------------------------------------
// GET  /api/tables/[tableId]/views — list views for a table
// ---------------------------------------------------------------------------

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tableId: string }> },
) {
  try {
    const { tableId } = await params;

    const result = await db
      .select()
      .from(views)
      .where(eq(views.tableId, tableId))
      .orderBy(views.createdAt);

    return Response.json(result);
  } catch (error) {
    console.error("GET /api/tables/[tableId]/views error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST /api/tables/[tableId]/views — create a view
// ---------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tableId: string }> },
) {
  try {
    const { tableId } = await params;

    const body = await request.json();
    const parsed = createViewSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { name, filters, sorts, hidden_columns } = parsed.data;

    const [view] = await db
      .insert(views)
      .values({
        tableId,
        name,
        filters: filters ?? [],
        sorts: sorts ?? [],
        hiddenColumns: hidden_columns ?? [],
      })
      .returning();

    return Response.json(view, { status: 201 });
  } catch (error) {
    console.error("POST /api/tables/[tableId]/views error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
