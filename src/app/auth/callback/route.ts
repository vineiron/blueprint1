import { NextResponse } from "next/server";
import { SITE_URL } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

function redirectOrigin(requestOrigin: string): string {
  if (process.env.NODE_ENV === "development") return requestOrigin;
  return new URL(SITE_URL).origin;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/dashboard";
  const next = nextParam.startsWith("/") ? nextParam : "/dashboard";
  const baseOrigin = redirectOrigin(origin);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${baseOrigin}${next}`);
    }
  }

  return NextResponse.redirect(`${baseOrigin}/auth/auth-code-error`);
}
