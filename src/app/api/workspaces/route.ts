import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { workspaces, workspaceMembers } from "@/db/schema/workspaces";
import { eq } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z
    .string()
    .min(1)
    .max(128)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens"),
});

// ---------------------------------------------------------------------------
// GET  /api/workspaces — list workspaces the current user belongs to
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    // TODO: replace with real auth — read userId from session / JWT
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const memberships = await db
      .select({
        workspace: workspaces,
        role: workspaceMembers.role,
      })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
      .where(eq(workspaceMembers.userId, userId));

    const result = memberships.map((m) => ({
      ...m.workspace,
      role: m.role,
    }));

    return Response.json(result);
  } catch (error) {
    console.error("GET /api/workspaces error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST /api/workspaces — create a new workspace
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createWorkspaceSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { name, slug } = parsed.data;

    // Check slug uniqueness
    const existing = await db
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(eq(workspaces.slug, slug))
      .limit(1);

    if (existing.length > 0) {
      return Response.json({ error: "Slug already taken" }, { status: 409 });
    }

    const [workspace] = await db
      .insert(workspaces)
      .values({ name, slug })
      .returning();

    // Add the creating user as owner
    await db.insert(workspaceMembers).values({
      workspaceId: workspace.id,
      userId,
      role: "owner",
    });

    return Response.json(workspace, { status: 201 });
  } catch (error) {
    console.error("POST /api/workspaces error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
