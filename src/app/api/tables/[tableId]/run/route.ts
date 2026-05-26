import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { tables, columns, rows, cells } from "@/db/schema/tables";
import { enrichmentJobs } from "@/db/schema/enrichment";
import { eq, asc, and, sql } from "drizzle-orm";
import { addEnrichColumnJob } from "@/lib/enrichment/queue";
import type { EnrichmentJobConfig, EnrichmentInput } from "@/lib/enrichment/types";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const runEnrichmentSchema = z.object({
  columnId: z.string().uuid(),
  mode: z.enum(["first_10", "all", "selected", "force_all"]),
  rowIds: z.array(z.string().uuid()).optional(),
});

// ---------------------------------------------------------------------------
// POST /api/tables/[tableId]/run — run enrichment on a table column
// ---------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tableId: string }> },
) {
  try {
    const { tableId } = await params;

    const body = await request.json();
    const parsed = runEnrichmentSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { columnId, mode, rowIds } = parsed.data;

    // Verify table exists and get workspaceId
    const [table] = await db
      .select({ id: tables.id, workspaceId: tables.workspaceId })
      .from(tables)
      .where(eq(tables.id, tableId))
      .limit(1);

    if (!table) {
      return Response.json({ error: "Table not found" }, { status: 404 });
    }

    // Verify column exists and is an enrichment column
    const [column] = await db
      .select()
      .from(columns)
      .where(and(eq(columns.id, columnId), eq(columns.tableId, tableId)))
      .limit(1);

    if (!column) {
      return Response.json({ error: "Column not found" }, { status: 404 });
    }

    if (column.columnType !== "enrichment") {
      return Response.json(
        { error: "Column is not an enrichment column" },
        { status: 400 },
      );
    }

    // Fetch rows for this table
    let tableRows;
    if (mode === "selected" && rowIds?.length) {
      tableRows = await db
        .select({ id: rows.id })
        .from(rows)
        .where(
          and(
            eq(rows.tableId, tableId),
            sql`${rows.id} = ANY(${rowIds})`,
          ),
        )
        .orderBy(asc(rows.position));
    } else {
      tableRows = await db
        .select({ id: rows.id })
        .from(rows)
        .where(eq(rows.tableId, tableId))
        .orderBy(asc(rows.position));
    }

    if (tableRows.length === 0) {
      return Response.json({ error: "No rows to enrich" }, { status: 400 });
    }

    // Fetch cell data for the input columns (all cells for these rows)
    const rowIdList = tableRows.map((r) => r.id);
    const rowCells = await db
      .select({
        rowId: cells.rowId,
        columnId: cells.columnId,
        value: cells.value,
      })
      .from(cells)
      .where(sql`${cells.rowId} = ANY(${rowIdList})`);

    // Build input data for each row
    // Group cells by row
    const cellsByRow = new Map<string, Record<string, unknown>>();
    for (const cell of rowCells) {
      let rowData = cellsByRow.get(cell.rowId);
      if (!rowData) {
        rowData = {};
        cellsByRow.set(cell.rowId, rowData);
      }
      rowData[cell.columnId] = cell.value;
    }

    const enrichmentRows = tableRows.map((row) => ({
      rowId: row.id,
      input: (cellsByRow.get(row.id) ?? {}) as EnrichmentInput,
    }));

    // Extract waterfall config from column config
    const columnConfig = column.config as Record<string, unknown>;
    const providerOrder =
      (columnConfig.providerOrder as Array<{ providerId: string; enabled: boolean }>) ?? [];

    const waterfallConfig = {
      fieldType: (columnConfig.fieldType as string) ?? "text",
      providerOrder: providerOrder
        .filter((p) => p.enabled)
        .map((p) => p.providerId),
      verificationProvider: columnConfig.verificationProvider as string | undefined,
    };

    // Build the job config
    const jobConfig: EnrichmentJobConfig = {
      tableId,
      columnId,
      workspaceId: table.workspaceId,
      waterfallConfig,
      mode,
      rowIds: rowIds ?? undefined,
    };

    // Create the enrichment job record in the database
    const [job] = await db
      .insert(enrichmentJobs)
      .values({
        tableId,
        columnId,
        workspaceId: table.workspaceId,
        status: "pending",
        totalRows: enrichmentRows.length,
        config: jobConfig,
      })
      .returning();

    // Queue the job via BullMQ
    // TODO: decrypt actual API keys from provider_keys table
    const apiKeys: Record<string, string> = {};

    await addEnrichColumnJob(job.id, jobConfig, enrichmentRows, apiKeys);

    return Response.json({ jobId: job.id }, { status: 202 });
  } catch (error) {
    console.error("POST /api/tables/[tableId]/run error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
