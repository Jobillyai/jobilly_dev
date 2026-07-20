import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { applySessionCookiesToSet } from "@/lib/auth/supabase-cookies";
import { isAdminPortalRole } from "@/lib/auth/roles";
import { sanitizeCandidateRedirectPath } from "@/lib/auth/safe-redirect";

function routeNeedsValidatedUser(pathname: string): boolean {
  if (pathname.startsWith("/admin")) {
    return true;
  }
  if (pathname === "/login" || pathname === "/signup") {
    return true;
  }
  return pathname === "/";
}

function routeNeedsAuthCheck(pathname: string): boolean {
  if (pathname.startsWith("/dashboard")) {
    return true;
  }
  if (pathname === "/login" || pathname === "/signup") {
    return true;
  }
  if (pathname.startsWith("/admin")) {
    return true;
  }
  return pathname === "/";
}

function routeNeedsRole(pathname: string, isLoggedIn: boolean): boolean {
  if (!isLoggedIn) {
    return false;
  }
  if (pathname.startsWith("/admin")) {
    return true;
  }
  if (pathname === "/login" || pathname === "/signup") {
    return true;
  }
  return pathname === "/";
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const { pathname } = request.nextUrl;

  if (!supabaseUrl || !supabaseAnonKey) {
    if (pathname.startsWith("/dashboard") || pathname.startsWith("/admin")) {
      const loginPath = pathname.startsWith("/admin") ? "/admin/login" : "/login";
      return NextResponse.redirect(new URL(loginPath, request.url));
    }
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: { name: string; value: string; options: CookieOptions }[],
      ) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        applySessionCookiesToSet(cookiesToSet, (name, value, options) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const needsAuthCheck = routeNeedsAuthCheck(pathname);

  let isLoggedIn = false;
  let userId: string | null = null;

  if (needsAuthCheck) {
    if (routeNeedsValidatedUser(pathname)) {
      const { data } = await supabase.auth.getUser();
      isLoggedIn = !!data.user;
      userId = data.user?.id ?? null;
    } else {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      isLoggedIn = !!session?.user;
      userId = session?.user?.id ?? null;
    }
  } else {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    isLoggedIn = !!session?.user;
    userId = session?.user?.id ?? null;
  }

  let userRole: string | null = null;
  if (routeNeedsRole(pathname, isLoggedIn) && userId) {
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", userId)
      .single();
    userRole = profile?.role ?? null;
  }

  const isAdmin = isAdminPortalRole(userRole);
  const isAdminLogin = pathname === "/admin/login";
  const isAdminRoute = pathname.startsWith("/admin");
  const isAuthEntryPage = pathname === "/login" || pathname === "/signup";
  const isProtectedPage = pathname.startsWith("/dashboard");

  if (isAdminRoute && !isAdminLogin && !isLoggedIn) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  if (isAdminRoute && !isAdminLogin && isLoggedIn && !isAdmin) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (isAdminLogin && isLoggedIn && isAdmin) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  if (isProtectedPage && !isLoggedIn) {
    const requestedPath = `${pathname}${request.nextUrl.search}`;
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set(
      "next",
      sanitizeCandidateRedirectPath(requestedPath),
    );
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthEntryPage && isLoggedIn) {
    const candidateNext = sanitizeCandidateRedirectPath(
      request.nextUrl.searchParams.get("next"),
    );
    const redirectUrl = new URL(isAdmin ? "/admin" : candidateNext, request.url);
    return NextResponse.redirect(redirectUrl);
  }

  if (pathname === "/" && isLoggedIn && isAdmin) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
