import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  users,
  accounts,
  verificationTokens,
  workspaceMembers,
} from "@/db/schema";
import { verifyPassword } from "./password";

export const { handlers, auth, signIn, signOut } = NextAuth(() => {
  const db = getDb();
  return {
    adapter: DrizzleAdapter(db, {
      usersTable: users,
      accountsTable: accounts,
      verificationTokensTable: verificationTokens,
    }),
    session: { strategy: "jwt" as const },
    pages: {
      signIn: "/auth/sign-in",
      newUser: "/auth/sign-up",
    },
    providers: [
      Google({
        clientId: process.env.AUTH_GOOGLE_ID,
        clientSecret: process.env.AUTH_GOOGLE_SECRET,
        allowDangerousEmailAccountLinking: true,
      }),
      Credentials({
        credentials: {
          email: { label: "Email", type: "email" },
          password: { label: "Password", type: "password" },
        },
        async authorize(credentials) {
          const email = credentials.email as string | undefined;
          const password = credentials.password as string | undefined;

          if (!email || !password) return null;

          const user = await db
            .select()
            .from(users)
            .where(eq(users.email, email.toLowerCase()))
            .then((rows) => rows[0] ?? null);

          if (!user || !user.passwordHash) return null;

          const valid = await verifyPassword(password, user.passwordHash);
          if (!valid) return null;

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.avatarUrl ?? user.image,
          };
        },
      }),
    ],
    callbacks: {
      async jwt({ token, user, trigger }) {
        if (user?.id) {
          token.userId = user.id;
        }

        if (trigger === "signIn" || (token.userId && !token.workspaceId)) {
          const membership = await db
            .select({ workspaceId: workspaceMembers.workspaceId })
            .from(workspaceMembers)
            .where(eq(workspaceMembers.userId, token.userId as string))
            .then((rows) => rows[0] ?? null);

          if (membership) {
            token.workspaceId = membership.workspaceId;
          }
        }

        return token;
      },
      async session({ session, token }) {
        if (token.userId) {
          session.user.id = token.userId as string;
        }
        if (token.workspaceId) {
          (session as SessionWithWorkspace).workspaceId =
            token.workspaceId as string;
        }
        return session;
      },
    },
  };
});

/** Extended session type that includes workspaceId. */
export interface SessionWithWorkspace {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  workspaceId?: string;
  expires: string;
}
