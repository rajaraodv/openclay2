import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { tables, columns, rows } from "@/db/schema/tables";
import { eq, count, asc } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const updateTableSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  auto_run: z.boolean().optional(),
});

// ---------------------------------------------------------------------------
// GET  /api/tables/[tableId] — get table with columns and row count
// ---------------------------------------------------------------------------

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tableId: string }> },
) {
  try {
    const { tableId } = await params;

    const [table] = await db
      .select()
      .from(tables)
      .where(eq(tables.id, tableId))
      .limit(1);

    if (!table) {
      return Response.json({ error: "Table not found" }, { status: 404 });
    }

    const tableCols = await db
      .select()
      .from(columns)
      .where(eq(columns.tableId, tableId))
      .orderBy(asc(columns.position));

    const [rowCountResult] = await db
      .select({ count: count() })
      .from(rows)
      .where(eq(rows.tableId, tableId));

    return Response.json({
      ...table,
      columns: tableCols,
      rowCount: rowCountResult?.count ?? 0,
    });
  } catch (error) {
    console.error("GET /api/tables/[tableId] error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/tables/[tableId] — update table
// ---------------------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tableId: string }> },
) {
  try {
    const { tableId } = await params;

    const body = await request.json();
    const parsed = updateTableSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const updates: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) updates.name = parsed.data.name;
    if (parsed.data.auto_run !== undefined) updates.autoRun = parsed.data.auto_run;

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: "No fields to update" }, { status: 400 });
    }

    const [updated] = await db
      .update(tables)
      .set(updates)
      .where(eq(tables.id, tableId))
      .returning();

    if (!updated) {
      return Response.json({ error: "Table not found" }, { status: 404 });
    }

    return Response.json(updated);
  } catch (error) {
    console.error("PATCH /api/tables/[tableId] error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/tables/[tableId] — delete table (cascade deletes columns, rows, cells)
// ---------------------------------------------------------------------------

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ tableId: string }> },
) {
  try {
    const { tableId } = await params;

    const [deleted] = await db
      .delete(tables)
      .where(eq(tables.id, tableId))
      .returning({ id: tables.id });

    if (!deleted) {
      return Response.json({ error: "Table not found" }, { status: 404 });
    }

    return Response.json({ success: true, id: deleted.id });
  } catch (error) {
    console.error("DELETE /api/tables/[tableId] error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
