import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be defined."
    );
  }

  const pathname = request.nextUrl.pathname;

  // Protected route definitions
  const isAdminRoute = pathname.startsWith("/admin");
  const isWorkerRoute = pathname.startsWith("/worker-dashboard");
  const isAuthRequiredRoute =
    isAdminRoute ||
    isWorkerRoute ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/bookings") ||
    pathname.startsWith("/messages") ||
    pathname.startsWith("/notifications") ||
    pathname.startsWith("/post-task");

  const hasAuthCookie = request.cookies.getAll().some((c) => c.name.includes("-auth-token"));

  // Fast path: if not a protected route and no auth cookies exist, skip Supabase network call
  if (!isAuthRequiredRoute && !hasAuthCookie) {
    return response;
  }

  // Fast redirect for unauthenticated users accessing protected routes without auth cookies
  if (isAuthRequiredRoute && !hasAuthCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({ name, value });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: "" });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({ name, value: "", ...options, maxAge: 0 });
      },
    },
  });

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (isAuthRequiredRoute && (!user || authError)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check role-based route access from database (profiles table)
  if (user && (isAdminRoute || isWorkerRoute)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const role = profile?.role;

    if (isAdminRoute && role !== "admin") {
      // Non-admins attempting to access /admin are redirected to /dashboard with forbidden notice
      const redirectUrl = new URL("/dashboard", request.url);
      redirectUrl.searchParams.set("error", "unauthorized_admin_access");
      return NextResponse.redirect(redirectUrl);
    }

    if (isWorkerRoute && role !== "worker" && role !== "admin") {
      // Non-workers attempting to access /worker-dashboard are redirected to /become-worker
      const becomeWorkerUrl = new URL("/become-worker", request.url);
      return NextResponse.redirect(becomeWorkerUrl);
    }
  }

  return response;
}
