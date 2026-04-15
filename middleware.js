import { NextResponse } from "next/server";

export function middleware(request) {
  const token = request.cookies.get("token")?.value;
  const { pathname } = request.nextUrl;

  // ---------- PUBLIC PAGES ----------
  const publicPaths = [
    "/login",
    "/api/auth/google",
    "/api/auth/callback",
    "/watch",
    "/connect",
  ];

  const isPublicPage = publicPaths.some((p) => pathname.startsWith(p));

  // ---------- WATCH / PAIRING API (CRITIQUE) ----------
  const isWatchApi =
    pathname.startsWith("/api/pairing") ||
    pathname.startsWith("/api/matches") ||
    pathname.startsWith("/api/points");

  // 👉 watch API ne doit PAS dépendre du login cookie
  if (isWatchApi) {
    return NextResponse.next();
  }

  // ---------- BLOCK UNAUTHENTICATED ----------
  if (!token && !isPublicPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // ---------- REDIRECT LOGGED USER ----------
  if (token && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
