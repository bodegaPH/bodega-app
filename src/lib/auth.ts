import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import bcrypt from "bcrypt";

const providers = [];

// Only add Google provider if credentials are configured
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
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
        const DUMMY_HASH = "$2b$10$K.0HwpsoPDGaB/JvnaHVk.OO7T8QkLn.Vy0tXKA1sLPvZTvg.xJNi";
        const hashToCompare = user?.password || DUMMY_HASH;
        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          hashToCompare
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
    })
  );

export const authOptions: NextAuthOptions = {
  adapter: process.env.DATABASE_URL ? (PrismaAdapter(prisma) as any) : undefined,
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
        const role =
          (user as any).role ??
          (user as any).systemRole ??
          "USER";
        token.id = (user as any).id ?? token.id;
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
        (session.user as any).id = token.id;
        (session.user as any).role = token.role ?? "USER";
        (session.user as any).activeOrgId = token.activeOrgId ?? null;
      }
      return session;
    },
  },
};
