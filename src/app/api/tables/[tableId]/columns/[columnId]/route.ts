import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { columns, cells } from "@/db/schema/tables";
import { eq, and } from "drizzle-orm";

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

const updateColumnSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  data_type: z.enum(dataTypeValues).optional(),
  column_type: z.enum(columnTypeValues).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  position: z.number().int().min(0).optional(),
  width: z.number().int().min(20).max(2000).optional(),
  pinned: z.boolean().optional(),
  hidden: z.boolean().optional(),
});

// ---------------------------------------------------------------------------
// PATCH /api/tables/[tableId]/columns/[columnId] — update column
// ---------------------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tableId: string; columnId: string }> },
) {
  try {
    const { tableId, columnId } = await params;

    const body = await request.json();
    const parsed = updateColumnSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = parsed.data;

    const updates: Record<string, unknown> = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.data_type !== undefined) updates.dataType = data.data_type;
    if (data.column_type !== undefined) updates.columnType = data.column_type;
    if (data.config !== undefined) updates.config = data.config;
    if (data.position !== undefined) updates.position = data.position;
    if (data.width !== undefined) updates.width = data.width;
    if (data.pinned !== undefined) updates.pinned = data.pinned;
    if (data.hidden !== undefined) updates.hidden = data.hidden;

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: "No fields to update" }, { status: 400 });
    }

    const [updated] = await db
      .update(columns)
      .set(updates)
      .where(and(eq(columns.id, columnId), eq(columns.tableId, tableId)))
      .returning();

    if (!updated) {
      return Response.json({ error: "Column not found" }, { status: 404 });
    }

    return Response.json(updated);
  } catch (error) {
    console.error("PATCH /api/tables/[tableId]/columns/[columnId] error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/tables/[tableId]/columns/[columnId] — delete column + its cells
// ---------------------------------------------------------------------------

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ tableId: string; columnId: string }> },
) {
  try {
    const { tableId, columnId } = await params;

    // Delete all cells for this column first (cascade should handle this, but
    // being explicit for clarity)
    await db.delete(cells).where(eq(cells.columnId, columnId));

    const [deleted] = await db
      .delete(columns)
      .where(and(eq(columns.id, columnId), eq(columns.tableId, tableId)))
      .returning({ id: columns.id });

    if (!deleted) {
      return Response.json({ error: "Column not found" }, { status: 404 });
    }

    return Response.json({ success: true, id: deleted.id });
  } catch (error) {
    console.error("DELETE /api/tables/[tableId]/columns/[columnId] error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
