import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { tables, columns, rows, cells } from "@/db/schema/tables";
import { eq, asc, desc, max, sql, and, count } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const createRowsSchema = z.union([
  // Single row: optional cell values keyed by column ID
  z.object({
    cells: z.record(z.string(), z.unknown()).optional(),
  }),
  // Bulk rows: array of cell maps
  z.array(
    z.object({
      cells: z.record(z.string(), z.unknown()).optional(),
    }),
  ),
]);

// ---------------------------------------------------------------------------
// GET  /api/tables/[tableId]/rows — paginated rows with cells
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tableId: string }> },
) {
  try {
    const { tableId } = await params;
    const searchParams = request.nextUrl.searchParams;

    // Pagination
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(
      1000,
      Math.max(1, parseInt(searchParams.get("limit") ?? "100", 10)),
    );
    const offset = (page - 1) * limit;

    // Sort — e.g. ?sort=columnId:asc,columnId2:desc
    // Default sort by row position ascending
    const sortParam = searchParams.get("sort");
    let orderClause = asc(rows.position);

    if (sortParam) {
      const [sortCol, sortDir] = sortParam.split(":");
      if (sortCol === "position") {
        orderClause = sortDir === "desc" ? desc(rows.position) : asc(rows.position);
      } else if (sortCol === "created_at") {
        orderClause = sortDir === "desc" ? desc(rows.createdAt) : asc(rows.createdAt);
      }
      // For column-based sorting, would need a subquery on cells — kept simple here
    }

    // Total count
    const [totalResult] = await db
      .select({ count: count() })
      .from(rows)
      .where(eq(rows.tableId, tableId));
    const total = totalResult?.count ?? 0;

    // Fetch rows
    const tableRows = await db
      .select()
      .from(rows)
      .where(eq(rows.tableId, tableId))
      .orderBy(orderClause)
      .limit(limit)
      .offset(offset);

    if (tableRows.length === 0) {
      return Response.json({
        rows: [],
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    }

    // Fetch cells for these rows
    const rowIds = tableRows.map((r) => r.id);
    const rowCells = await db
      .select()
      .from(cells)
      .where(sql`${cells.rowId} = ANY(${rowIds})`);

    // Group cells by row
    const cellsByRow = new Map<string, typeof rowCells>();
    for (const cell of rowCells) {
      const existing = cellsByRow.get(cell.rowId) ?? [];
      existing.push(cell);
      cellsByRow.set(cell.rowId, existing);
    }

    // Build response
    const result = tableRows.map((row) => {
      const rowCellsList = cellsByRow.get(row.id) ?? [];
      const cellMap: Record<string, {
        id: string;
        value: unknown;
        rawValue: unknown;
        status: string;
        source: string | null;
        confidence: number | null;
        errorMessage: string | null;
      }> = {};

      for (const cell of rowCellsList) {
        cellMap[cell.columnId] = {
          id: cell.id,
          value: cell.value,
          rawValue: cell.rawValue,
          status: cell.status,
          source: cell.source,
          confidence: cell.confidence,
          errorMessage: cell.errorMessage,
        };
      }

      return {
        id: row.id,
        position: row.position,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        cells: cellMap,
      };
    });

    return Response.json({
      rows: result,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET /api/tables/[tableId]/rows error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST /api/tables/[tableId]/rows — add row(s), auto-set position, create cells
// ---------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tableId: string }> },
) {
  try {
    const { tableId } = await params;

    const body = await request.json();
    const parsed = createRowsSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    // Normalise to array
    const rowInputs = Array.isArray(parsed.data) ? parsed.data : [parsed.data];

    // Get all columns for this table
    const tableCols = await db
      .select({ id: columns.id })
      .from(columns)
      .where(eq(columns.tableId, tableId));

    // Get current max position
    const [maxPos] = await db
      .select({ maxPosition: max(rows.position) })
      .from(rows)
      .where(eq(rows.tableId, tableId));

    let nextPosition = (maxPos?.maxPosition ?? -1) + 1;

    const createdRows: Array<{ id: string; position: number }> = [];

    for (const rowInput of rowInputs) {
      // Insert row
      const [newRow] = await db
        .insert(rows)
        .values({
          tableId,
          position: nextPosition,
        })
        .returning();

      createdRows.push({ id: newRow.id, position: newRow.position });

      // Create cells for every column
      if (tableCols.length > 0) {
        const cellValues = tableCols.map((col) => ({
          rowId: newRow.id,
          columnId: col.id,
          value: rowInput.cells?.[col.id] ?? null,
          status: "empty" as const,
        }));

        await db.insert(cells).values(cellValues);
      }

      nextPosition++;
    }

    // Update table row count
    await db
      .update(tables)
      .set({ rowCount: sql`${tables.rowCount} + ${rowInputs.length}` })
      .where(eq(tables.id, tableId));

    return Response.json({ rows: createdRows }, { status: 201 });
  } catch (error) {
    console.error("POST /api/tables/[tableId]/rows error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
