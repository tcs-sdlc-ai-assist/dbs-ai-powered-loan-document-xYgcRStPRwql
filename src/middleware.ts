import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

// ---------------------------------------------------------------------------
// Public paths that do not require authentication
// ---------------------------------------------------------------------------

const PUBLIC_PATHS = [
  "/login",
  "/api/auth",
  "/api/health",
] as const;

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (publicPath) =>
      pathname === publicPath || pathname.startsWith(publicPath + "/")
  );
}

// ---------------------------------------------------------------------------
// Static asset paths that should be ignored by middleware
// ---------------------------------------------------------------------------

function isStaticAsset(pathname: string): boolean {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/static") ||
    pathname.includes(".")
  );
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static assets
  if (isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  // Allow public paths without authentication
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Check for a valid NextAuth JWT token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Redirect unauthenticated users to /login
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Add user role to request headers for downstream use
  const requestHeaders = new Headers(request.headers);

  if (token.role) {
    requestHeaders.set("x-user-role", token.role as string);
  }

  if (token.id) {
    requestHeaders.set("x-user-id", token.id as string);
  }

  if (token.email) {
    requestHeaders.set("x-user-email", token.email as string);
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

// ---------------------------------------------------------------------------
// Matcher configuration
// ---------------------------------------------------------------------------

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};