import { NextRequest } from "next/server";
import Papa from "papaparse";
import { db } from "@/db";
import { tables, columns, rows, cells } from "@/db/schema/tables";
import { eq, sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type DataType =
  | "text"
  | "url"
  | "number"
  | "date"
  | "email"
  | "checkbox";

/**
 * Heuristic column type detection from sample values.
 */
function detectDataType(values: string[]): DataType {
  const nonEmpty = values.filter((v) => v.trim() !== "");
  if (nonEmpty.length === 0) return "text";

  const sample = nonEmpty.slice(0, 50);

  // Email
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (sample.every((v) => emailRe.test(v))) return "email";

  // URL
  const urlRe = /^https?:\/\//i;
  if (sample.every((v) => urlRe.test(v))) return "url";

  // Number (including decimals and negatives)
  if (sample.every((v) => !isNaN(Number(v)) && v.trim() !== "")) return "number";

  // Date (ISO, common US/EU formats)
  const dateRe = /^\d{4}-\d{2}-\d{2}|^\d{1,2}\/\d{1,2}\/\d{2,4}/;
  if (sample.every((v) => dateRe.test(v) && !isNaN(Date.parse(v)))) return "date";

  // Checkbox / boolean
  const boolValues = new Set(["true", "false", "yes", "no", "1", "0"]);
  if (sample.every((v) => boolValues.has(v.toLowerCase()))) return "checkbox";

  return "text";
}

// ---------------------------------------------------------------------------
// POST /api/tables/[tableId]/import — CSV import via FormData
// ---------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tableId: string }> },
) {
  try {
    const { tableId } = await params;

    // Verify table exists
    const [table] = await db
      .select({ id: tables.id })
      .from(tables)
      .where(eq(tables.id, tableId))
      .limit(1);

    if (!table) {
      return Response.json({ error: "Table not found" }, { status: 404 });
    }

    // Read the uploaded CSV from FormData
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return Response.json(
        { error: "Missing 'file' field in form data" },
        { status: 400 },
      );
    }

    const csvText = await file.text();

    // Parse CSV
    const parseResult = Papa.parse<Record<string, string>>(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h: string) => h.trim(),
    });

    if (parseResult.errors.length > 0 && parseResult.data.length === 0) {
      return Response.json(
        { error: "CSV parse error", details: parseResult.errors.slice(0, 5) },
        { status: 400 },
      );
    }

    const headers = parseResult.meta.fields ?? [];
    const csvRows = parseResult.data;

    if (headers.length === 0) {
      return Response.json({ error: "CSV has no columns" }, { status: 400 });
    }

    // Detect column types from the data
    const columnDefs = headers.map((header, index) => {
      const sampleValues = csvRows.map((row) => row[header] ?? "");
      return {
        name: header,
        dataType: detectDataType(sampleValues),
        position: index,
      };
    });

    // Insert columns
    const createdColumns = await db
      .insert(columns)
      .values(
        columnDefs.map((col) => ({
          tableId,
          name: col.name,
          dataType: col.dataType,
          columnType: "manual" as const,
          position: col.position,
          config: {},
        })),
      )
      .returning();

    // Build header-to-column-id mapping
    const headerToColumnId = new Map<string, string>();
    for (let i = 0; i < headers.length; i++) {
      headerToColumnId.set(headers[i], createdColumns[i].id);
    }

    // Insert rows and cells in batches
    const BATCH_SIZE = 500;
    let rowsImported = 0;

    for (let batchStart = 0; batchStart < csvRows.length; batchStart += BATCH_SIZE) {
      const batch = csvRows.slice(batchStart, batchStart + BATCH_SIZE);

      // Insert rows
      const rowValues = batch.map((_, idx) => ({
        tableId,
        position: batchStart + idx,
      }));

      const createdRows = await db.insert(rows).values(rowValues).returning();

      // Insert cells for all rows in this batch
      const cellValues: Array<{
        rowId: string;
        columnId: string;
        value: unknown;
        status: "empty" | "complete";
      }> = [];

      for (let i = 0; i < batch.length; i++) {
        const csvRow = batch[i];
        const rowId = createdRows[i].id;

        for (const header of headers) {
          const columnId = headerToColumnId.get(header)!;
          const rawValue = csvRow[header] ?? null;

          cellValues.push({
            rowId,
            columnId,
            value: rawValue !== null && rawValue !== "" ? rawValue : null,
            status: rawValue !== null && rawValue !== "" ? "complete" : "empty",
          });
        }
      }

      if (cellValues.length > 0) {
        await db.insert(cells).values(cellValues);
      }

      rowsImported += batch.length;
    }

    // Update table row count
    await db
      .update(tables)
      .set({ rowCount: sql`${tables.rowCount} + ${rowsImported}` })
      .where(eq(tables.id, tableId));

    return Response.json(
      {
        columnsCreated: createdColumns.length,
        rowsImported,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/tables/[tableId]/import error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
