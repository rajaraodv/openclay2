import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { cells } from "@/db/schema/tables";
import { eq, and } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const updateCellSchema = z.object({
  rowId: z.string().uuid(),
  columnId: z.string().uuid(),
  value: z.unknown(),
});

const batchUpdateCellsSchema = z.array(updateCellSchema).min(1).max(5000);

// ---------------------------------------------------------------------------
// PATCH /api/tables/[tableId]/cells — batch update cells
// ---------------------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tableId: string }> },
) {
  try {
    const { tableId } = await params;

    const body = await request.json();
    const parsed = batchUpdateCellsSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const updates = parsed.data;
    const results: Array<{ rowId: string; columnId: string; success: boolean }> = [];

    // Process each cell update
    // For production, this could be optimised with a bulk upsert, but for
    // correctness we use individual updates within the same request.
    for (const update of updates) {
      const [updated] = await db
        .update(cells)
        .set({
          value: update.value as Record<string, unknown> | null,
          status: "complete",
        })
        .where(
          and(eq(cells.rowId, update.rowId), eq(cells.columnId, update.columnId)),
        )
        .returning({ id: cells.id });

      if (updated) {
        results.push({
          rowId: update.rowId,
          columnId: update.columnId,
          success: true,
        });
      } else {
        // Cell doesn't exist — create it
        await db.insert(cells).values({
          rowId: update.rowId,
          columnId: update.columnId,
          value: update.value as Record<string, unknown> | null,
          status: "complete",
        });
        results.push({
          rowId: update.rowId,
          columnId: update.columnId,
          success: true,
        });
      }
    }

    return Response.json({ updated: results.length, results });
  } catch (error) {
    console.error("PATCH /api/tables/[tableId]/cells error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
