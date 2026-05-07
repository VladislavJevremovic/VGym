import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { PIN_COOKIE } from "./lib/auth-constants";
import { verifyAuthCookie } from "./lib/auth";

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (path === "/setup" || path.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  const cookieValue = request.cookies.get(PIN_COOKIE)?.value;
  const authed = cookieValue ? await verifyAuthCookie(cookieValue) : false;

  if (path.startsWith("/api/")) {
    if (!authed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (!authed) {
    return NextResponse.redirect(new URL("/setup", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons|manifest).*)"],
};
