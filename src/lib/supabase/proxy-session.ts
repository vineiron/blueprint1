import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/env";

const PROTECTED_PREFIXES = ["/dashboard", "/blueprints"];

function copyCookies(from: NextResponse, to: NextResponse) {
  for (const cookie of from.cookies.getAll()) to.cookies.set(cookie);
}

/**
 * Refreshes the Supabase session cookie on each request (required for SSR auth)
 * and performs OPTIMISTIC redirects for the app shell. This is NOT the security
 * boundary — every page/action re-checks auth + ownership in server code.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        supabaseResponse = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          supabaseResponse.cookies.set(name, value, options);
        }
      },
    },
  });

  // Do not run code between createServerClient and getUser(); do not remove
  // getUser() — it rotates the auth token.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((p) => path.startsWith(p));

  if (!user && isProtected) {
    // No dedicated sign-in page: bounce to home with ?signin=1 (+ next) so the
    // landing auto-opens the sign-in popup and returns here after sign-in.
    const next = path + request.nextUrl.search;
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    url.searchParams.set("signin", "1");
    url.searchParams.set("next", next);
    const redirect = NextResponse.redirect(url);
    copyCookies(supabaseResponse, redirect);
    return redirect;
  }

  return supabaseResponse;
}
