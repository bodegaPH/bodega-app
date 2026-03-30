import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { changePassword, AccountApiError } from "@/features/account/server";
import { changePasswordSchema } from "@/features/account/schemas";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

function createRateLimitHeaders(rateLimit: {
  limit: number;
  remaining: number;
  reset: number;
}) {
  return {
    "X-RateLimit-Limit": rateLimit.limit.toString(),
    "X-RateLimit-Remaining": rateLimit.remaining.toString(),
    "X-RateLimit-Reset": rateLimit.reset.toString(),
  };
}

export async function POST(req: NextRequest) {
  const rateLimit = checkRateLimit(getClientIp(req));

  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      {
        status: 429,
        headers: createRateLimitHeaders(rateLimit),
      }
    );
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: createRateLimitHeaders(rateLimit) }
      );
    }

    const userId = session.user.id;
    const body = await req.json();
    const validation = changePasswordSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.format() },
        { status: 400, headers: createRateLimitHeaders(rateLimit) }
      );
    }

    const { currentPassword, newPassword } = validation.data;

    await changePassword(userId, currentPassword, newPassword);

    return NextResponse.json(
      {
        message: "Password changed successfully",
      },
      { headers: createRateLimitHeaders(rateLimit) }
    );
  } catch (error) {
    if (error instanceof AccountApiError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status, headers: createRateLimitHeaders(rateLimit) }
      );
    }

    console.error("Error changing password:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: createRateLimitHeaders(rateLimit) }
    );
  }
}
