import { useSession as useNextAuthSession } from "next-auth/react";
import type { SessionWithWorkspace } from "@/auth";

/**
 * Typed wrapper around next-auth's useSession that exposes workspaceId.
 *
 * Usage:
 * ```ts
 * const { session, status, update } = useSession();
 * session?.workspaceId // string | undefined
 * session?.user.id     // string
 * ```
 */
export function useSession() {
  const { data, status, update } = useNextAuthSession();

  return {
    session: data as SessionWithWorkspace | null,
    status,
    update,
    isAuthenticated: status === "authenticated",
    isLoading: status === "loading",
  };
}
