import { NextRequest } from "next/server";
import { db } from "@/db";
import { tables, rows, cells } from "@/db/schema/tables";
import { eq, and, sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// DELETE /api/tables/[tableId]/rows/[rowId] — delete row + its cells
// ---------------------------------------------------------------------------

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ tableId: string; rowId: string }> },
) {
  try {
    const { tableId, rowId } = await params;

    // Delete cells for this row (cascade should handle it, but being explicit)
    await db.delete(cells).where(eq(cells.rowId, rowId));

    const [deleted] = await db
      .delete(rows)
      .where(and(eq(rows.id, rowId), eq(rows.tableId, tableId)))
      .returning({ id: rows.id });

    if (!deleted) {
      return Response.json({ error: "Row not found" }, { status: 404 });
    }

    // Decrement table row count
    await db
      .update(tables)
      .set({ rowCount: sql`GREATEST(${tables.rowCount} - 1, 0)` })
      .where(eq(tables.id, tableId));

    return Response.json({ success: true, id: deleted.id });
  } catch (error) {
    console.error("DELETE /api/tables/[tableId]/rows/[rowId] error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
