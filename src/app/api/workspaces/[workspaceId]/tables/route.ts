import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { tables } from "@/db/schema/tables";
import { eq } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const createTableSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
});

// ---------------------------------------------------------------------------
// GET  /api/workspaces/[workspaceId]/tables — list tables in a workspace
// ---------------------------------------------------------------------------

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  try {
    const { workspaceId } = await params;

    const result = await db
      .select()
      .from(tables)
      .where(eq(tables.workspaceId, workspaceId))
      .orderBy(tables.createdAt);

    return Response.json(result);
  } catch (error) {
    console.error("GET /api/workspaces/[workspaceId]/tables error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST /api/workspaces/[workspaceId]/tables — create a table
// ---------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceId } = await params;

    const body = await request.json();
    const parsed = createTableSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { name, description } = parsed.data;

    const [table] = await db
      .insert(tables)
      .values({
        workspaceId,
        name,
        description: description ?? null,
        createdBy: userId,
      })
      .returning();

    return Response.json(table, { status: 201 });
  } catch (error) {
    console.error("POST /api/workspaces/[workspaceId]/tables error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
