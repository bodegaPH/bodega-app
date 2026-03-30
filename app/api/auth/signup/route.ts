import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcrypt";
import { z } from "zod";
import { emailSchema } from "@/lib/schemas";
import { Prisma } from "@prisma/client";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

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

// Signup validation schema
const signupSchema = z
  .object({
    email: emailSchema,
    password: z
      .string()
      .min(12, "Password must be at least 12 characters")
      .max(72, "Password must not exceed 72 characters"),
    name: z.string().optional(),
  })
  .strict();

export async function POST(req: Request) {
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
    // Parse and validate request body
    const body = await req.json();
    const validation = signupSchema.safeParse(body);

    if (!validation.success) {
      const firstError = validation.error.issues[0];
      const fieldName = firstError.path[0] || "input";
      const message = firstError.message;
      
      return NextResponse.json(
        { error: `${String(fieldName).charAt(0).toUpperCase() + String(fieldName).slice(1)}: ${message}` },
        {
          status: 400,
          headers: createRateLimitHeaders(rateLimit),
        }
      );
    }

    const { email, password, name } = validation.data;

    // Hash password before database operation
    const hashedPassword = await bcrypt.hash(password, 10);

    // Atomic user creation - no TOCTOU vulnerability
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
    });

    return NextResponse.json(
      { message: "User created successfully", userId: user.id },
      {
        status: 201,
        headers: createRateLimitHeaders(rateLimit),
      }
    );
  } catch (error) {
    // Handle duplicate email (P2002 - unique constraint violation)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "This email is already registered. Please sign in instead." },
          {
            status: 409,
            headers: createRateLimitHeaders(rateLimit),
          }
        );
      }
    }

    console.error("Sign-up error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      {
        status: 500,
        headers: createRateLimitHeaders(rateLimit),
      }
    );
  }
}
