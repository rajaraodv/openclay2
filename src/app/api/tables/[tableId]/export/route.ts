import { NextRequest } from "next/server";
import { db } from "@/db";
import { tables, columns, rows, cells } from "@/db/schema/tables";
import { eq, asc, sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeCSVField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// ---------------------------------------------------------------------------
// GET /api/tables/[tableId]/export — stream CSV of all rows
// ---------------------------------------------------------------------------

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tableId: string }> },
) {
  try {
    const { tableId } = await params;

    // Verify table exists
    const [table] = await db
      .select({ id: tables.id, name: tables.name })
      .from(tables)
      .where(eq(tables.id, tableId))
      .limit(1);

    if (!table) {
      return Response.json({ error: "Table not found" }, { status: 404 });
    }

    // Fetch columns ordered by position
    const tableCols = await db
      .select({ id: columns.id, name: columns.name })
      .from(columns)
      .where(eq(columns.tableId, tableId))
      .orderBy(asc(columns.position));

    if (tableCols.length === 0) {
      return new Response("", {
        status: 200,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${table.name}.csv"`,
        },
      });
    }

    // Fetch all rows
    const tableRows = await db
      .select({ id: rows.id })
      .from(rows)
      .where(eq(rows.tableId, tableId))
      .orderBy(asc(rows.position));

    if (tableRows.length === 0) {
      // Return just headers
      const headerLine = tableCols.map((c) => escapeCSVField(c.name)).join(",");
      return new Response(headerLine + "\n", {
        status: 200,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${table.name}.csv"`,
        },
      });
    }

    // Fetch all cells for this table's rows
    const rowIds = tableRows.map((r) => r.id);
    const allCells = await db
      .select({
        rowId: cells.rowId,
        columnId: cells.columnId,
        value: cells.value,
      })
      .from(cells)
      .where(sql`${cells.rowId} = ANY(${rowIds})`);

    // Build lookup: rowId -> columnId -> value
    const cellLookup = new Map<string, Map<string, unknown>>();
    for (const cell of allCells) {
      let rowMap = cellLookup.get(cell.rowId);
      if (!rowMap) {
        rowMap = new Map();
        cellLookup.set(cell.rowId, rowMap);
      }
      rowMap.set(cell.columnId, cell.value);
    }

    // Build CSV
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        // Header row
        const headerLine =
          tableCols.map((c) => escapeCSVField(c.name)).join(",") + "\n";
        controller.enqueue(encoder.encode(headerLine));

        // Data rows
        for (const row of tableRows) {
          const rowMap = cellLookup.get(row.id);
          const fields = tableCols.map((col) => {
            const val = rowMap?.get(col.id);
            if (val === null || val === undefined) return "";
            const str = typeof val === "object" ? JSON.stringify(val) : String(val);
            return escapeCSVField(str);
          });
          controller.enqueue(encoder.encode(fields.join(",") + "\n"));
        }

        controller.close();
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Cache-Control": "no-cache",
        "Content-Disposition": `attachment; filename="${table.name}.csv"`,
      },
    });
  } catch (error) {
    console.error("GET /api/tables/[tableId]/export error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
