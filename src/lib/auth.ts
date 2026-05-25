import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getServerSession as nextAuthGetServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db";
import type { UserRole } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: UserRole;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email: string;
    name: string;
    role: UserRole;
  }
}

// ---------------------------------------------------------------------------
// Authorized Routes Per Role
// ---------------------------------------------------------------------------
export const AUTHORIZED_ROUTES: Record<UserRole, string[]> = {
  ADMIN: [
    "/dashboard",
    "/applications",
    "/documents",
    "/extraction",
    "/validation",
    "/recommendations",
    "/reviews",
    "/audit",
    "/users",
    "/settings",
  ],
  ANALYST: [
    "/dashboard",
    "/applications",
    "/documents",
    "/extraction",
    "/validation",
    "/recommendations",
    "/reviews",
    "/audit",
  ],
  REVIEWER: [
    "/dashboard",
    "/applications",
    "/documents",
    "/extraction",
    "/validation",
    "/recommendations",
    "/reviews",
    "/audit",
  ],
  VIEWER: [
    "/dashboard",
    "/applications",
    "/documents",
    "/extraction",
    "/validation",
    "/recommendations",
    "/reviews",
  ],
} as const;

// ---------------------------------------------------------------------------
// NextAuth Configuration
// ---------------------------------------------------------------------------
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "user@dbs.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          });

          if (!user) {
            return null;
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isPasswordValid) {
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        id: token.id,
        email: token.email,
        name: token.name,
        role: token.role,
      };
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
};

// ---------------------------------------------------------------------------
// Helper: getServerSession
// ---------------------------------------------------------------------------
export async function getServerSession() {
  return nextAuthGetServerSession(authOptions);
}

// ---------------------------------------------------------------------------
// Helper: Check if a role is authorized for a given path
// ---------------------------------------------------------------------------
export function isAuthorizedForRoute(role: UserRole, path: string): boolean {
  const authorizedRoutes = AUTHORIZED_ROUTES[role];
  if (!authorizedRoutes) {
    return false;
  }
  return authorizedRoutes.some(
    (route) => path === route || path.startsWith(route + "/")
  );
}