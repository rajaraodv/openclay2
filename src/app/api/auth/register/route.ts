import { NextRequest } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, workspaces, workspaceMembers } from "@/db/schema";
import { hashPassword } from "@/auth/password";

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be at most 128 characters"),
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be at most 100 characters"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { email, password, name } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .then((rows) => rows[0] ?? null);

    if (existing) {
      return Response.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    // Create user, workspace, and membership in a transaction
    const result = await db.transaction(async (tx) => {
      const [newUser] = await tx
        .insert(users)
        .values({
          email: normalizedEmail,
          name: name.trim(),
          passwordHash,
        })
        .returning({
          id: users.id,
          email: users.email,
          name: users.name,
          createdAt: users.createdAt,
        });

      if (!newUser) throw new Error("Failed to create user");

      // Generate a URL-friendly slug from the user's name
      const baseSlug = name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      const slug = `${baseSlug}-${newUser.id.slice(0, 8)}`;

      const [workspace] = await tx
        .insert(workspaces)
        .values({
          name: `${name.trim()}'s Workspace`,
          slug,
        })
        .returning({ id: workspaces.id });

      if (!workspace) throw new Error("Failed to create workspace");

      await tx.insert(workspaceMembers).values({
        workspaceId: workspace.id,
        userId: newUser.id,
        role: "owner",
      });

      return {
        user: newUser,
        workspaceId: workspace.id,
      };
    });

    return Response.json(
      {
        user: result.user,
        workspaceId: result.workspaceId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return Response.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
