import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { NextAuthOptions } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import bcrypt from "bcrypt";
import type { SystemRole } from "@prisma/client";
import { normalizeSystemRole } from "@/lib/system-role";

/**
 * Shape of the user object as received in the JWT callback.
 * Covers both the credentials provider return value (augmented User type)
 * and the raw Prisma adapter shape returned for OAuth sign-ins.
 */
type IncomingUser = {
  id?: string | null;
  /** Present when the credentials provider returns the user. */
  role?: SystemRole | "PLATFORM_ADMIN";
  /** Present when the Prisma adapter returns the raw DB row for OAuth users. */
  systemRole?: SystemRole | "PLATFORM_ADMIN";
};

const providers = [];

// Only add Google provider if credentials are configured
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  );
}

// Always add Credentials provider as fallback
providers.push(
  CredentialsProvider({
    name: "Credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) {
        return null;
      }

      const user = await prisma.user.findUnique({
        where: { email: credentials.email },
      });

      // Constant-time comparison to prevent timing attacks on user enumeration
      // Always run bcrypt even if user doesn't exist
      const DUMMY_HASH =
        "$2b$10$K.0HwpsoPDGaB/JvnaHVk.OO7T8QkLn.Vy0tXKA1sLPvZTvg.xJNi";
      const hashToCompare = user?.password || DUMMY_HASH;
      const isPasswordValid = await bcrypt.compare(
        credentials.password,
        hashToCompare,
      );

      if (!user || !user.password || !isPasswordValid) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.systemRole,
      };
    },
  }),
);

export const authOptions: NextAuthOptions = {
  adapter:
    process.env.NEXT_PHASE === "phase-production-build"
      ? undefined
      : process.env.DATABASE_URL
        ? (PrismaAdapter(prisma) as Adapter)
        : undefined,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/signin",
  },
  providers,
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        const u = user as IncomingUser;
        const role = normalizeSystemRole(u.role ?? u.systemRole ?? "USER");
        token.id = u.id ?? token.id;
        token.role = role;
      }
      // Allow updating activeOrgId via update() call
      if (trigger === "update" && session?.activeOrgId !== undefined) {
        token.activeOrgId = session.activeOrgId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = normalizeSystemRole(token.role ?? "USER");
        session.user.activeOrgId = token.activeOrgId ?? null;
      }
      return session;
    },
  },
};
