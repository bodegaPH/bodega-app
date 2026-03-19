import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { Session } from "next-auth";

type AuthResult =
  | { success: true; session: Session }
  | { success: false; response: NextResponse };

/**
 * Validates auth for API routes. Returns discriminated union for type safety.
 *
 * Usage:
 * ```ts
 * const auth = await requireAuth();
 * if (!auth.success) return auth.response;
 * const { session } = auth;
 * ```
 */
export async function requireAuth(): Promise<AuthResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return {
      success: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { success: true, session };
}
