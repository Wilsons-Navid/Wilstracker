import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Auth callback for email confirmation / magic links.
 *
 * Supabase sends the user here with a one-time `?code=` (PKCE flow). We exchange
 * it for a session, then route by role: candidates to their portal, staff to the
 * board. The redirect origin is taken from the request, so the same handler
 * works on localhost and in production without hardcoding a URL.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const errorDescription = searchParams.get("error_description");

  // Supabase can bounce back here with an error (e.g. an expired link).
  if (errorDescription) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(errorDescription)}`,
    );
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("This link is invalid or has expired. Please sign in.")}`,
    );
  }

  // An internal `next` path (e.g. the password-recovery flow points here so the
  // code is exchanged before the user sets a new password). Only same-site paths
  // are honored, never an absolute or protocol-relative URL.
  const next = searchParams.get("next");
  if (next && next.startsWith("/") && !next.startsWith("//")) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  // Session is set — decide where to land based on the profile role.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user?.id ?? "")
    .single();

  const dest =
    (profile as { role: string } | null)?.role === "candidate" ? "/portal" : "/";
  return NextResponse.redirect(`${origin}${dest}`);
}
