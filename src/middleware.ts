import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { applySessionCookiesToSet, attachTabSessionCookie, TAB_SESSION_COOKIE_NAME } from "@/lib/auth/supabase-cookies";
import { isAdminPortalRole } from "@/lib/auth/roles";
import { sanitizeCandidateRedirectPath } from "@/lib/auth/safe-redirect";
import {
  STAFF_FORCE_PASSWORD_PATH,
  staffMustChangePassword,
} from "@/lib/auth/staff-password";

function routeNeedsValidatedUser(pathname: string): boolean {
  if (pathname.startsWith("/admin") || pathname === "/resume_dashboard.html") {
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
  if (pathname.startsWith("/admin") || pathname === "/resume_dashboard.html") {
    return true;
  }
  return pathname === "/";
}

function routeNeedsRole(pathname: string, isLoggedIn: boolean): boolean {
  if (!isLoggedIn) {
    return false;
  }
  if (pathname.startsWith("/admin") || pathname === "/resume_dashboard.html") {
    return true;
  }
  if (pathname === "/login" || pathname === "/signup") {
    return true;
  }
  return pathname === "/";
}

function redirectWithTabSession(
  url: URL,
  isLoggedIn: boolean,
): NextResponse {
  const redirectResponse = NextResponse.redirect(url);
  attachTabSessionCookie(redirectResponse, isLoggedIn);
  return redirectResponse;
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const { pathname } = request.nextUrl;

  if (!supabaseUrl || !supabaseAnonKey) {
    if (
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/admin") ||
      pathname === "/resume_dashboard.html"
    ) {
      const loginPath =
        pathname.startsWith("/admin") || pathname === "/resume_dashboard.html"
          ? "/admin/login"
          : "/login";
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
  let mustChangeStaffPasswordFlag = false;

  if (needsAuthCheck) {
    if (routeNeedsValidatedUser(pathname)) {
      const { data } = await supabase.auth.getUser();
      isLoggedIn = !!data.user;
      userId = data.user?.id ?? null;
      mustChangeStaffPasswordFlag = staffMustChangePassword(
        data.user?.app_metadata as Record<string, unknown> | undefined,
      );
    } else {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      isLoggedIn = !!session?.user;
      userId = session?.user?.id ?? null;
      mustChangeStaffPasswordFlag = staffMustChangePassword(
        session?.user?.app_metadata as Record<string, unknown> | undefined,
      );
    }
  } else {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    isLoggedIn = !!session?.user;
    userId = session?.user?.id ?? null;
    mustChangeStaffPasswordFlag = staffMustChangePassword(
      session?.user?.app_metadata as Record<string, unknown> | undefined,
    );
  }

  const hasTabSession = request.cookies.has(TAB_SESSION_COOKIE_NAME);
  if (isLoggedIn && !hasTabSession) {
    await supabase.auth.signOut();
    isLoggedIn = false;
    userId = null;
    mustChangeStaffPasswordFlag = false;
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
  const isResumeDashboard = pathname === "/resume_dashboard.html";
  const isAuthEntryPage = pathname === "/login" || pathname === "/signup";
  const isProtectedPage = pathname.startsWith("/dashboard");
  const forcePasswordHome = `${STAFF_FORCE_PASSWORD_PATH}?forcePassword=1`;

  if ((isAdminRoute || isResumeDashboard) && !isAdminLogin && !isLoggedIn) {
    return redirectWithTabSession(new URL("/admin/login", request.url), false);
  }

  if ((isAdminRoute || isResumeDashboard) && !isAdminLogin && isLoggedIn && !isAdmin) {
    return redirectWithTabSession(new URL("/dashboard", request.url), true);
  }

  if (isAdmin && isLoggedIn && mustChangeStaffPasswordFlag) {
    const onForcePasswordPage = pathname === STAFF_FORCE_PASSWORD_PATH;
    if (isAdminLogin || isResumeDashboard || (isAdminRoute && !onForcePasswordPage)) {
      return redirectWithTabSession(new URL(forcePasswordHome, request.url), true);
    }
  }

  if (isAdminLogin && isLoggedIn && isAdmin) {
    return redirectWithTabSession(
      new URL(
        mustChangeStaffPasswordFlag ? forcePasswordHome : "/admin",
        request.url,
      ),
      true,
    );
  }

  if (isProtectedPage && !isLoggedIn) {
    const requestedPath = `${pathname}${request.nextUrl.search}`;
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set(
      "next",
      sanitizeCandidateRedirectPath(requestedPath),
    );
    return redirectWithTabSession(loginUrl, false);
  }

  if (isAuthEntryPage && isLoggedIn) {
    const candidateNext = sanitizeCandidateRedirectPath(
      request.nextUrl.searchParams.get("next"),
    );
    const redirectUrl = new URL(
      isAdmin
        ? mustChangeStaffPasswordFlag
          ? forcePasswordHome
          : "/admin"
        : candidateNext,
      request.url,
    );
    return redirectWithTabSession(redirectUrl, true);
  }

  if (pathname === "/" && isLoggedIn && isAdmin) {
    return redirectWithTabSession(
      new URL(
        mustChangeStaffPasswordFlag ? forcePasswordHome : "/admin",
        request.url,
      ),
      true,
    );
  }

  attachTabSessionCookie(response, isLoggedIn);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
