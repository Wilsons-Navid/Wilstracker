import Link from "next/link";
import LoginForm from "@/components/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const signupHref = next ? `/signup?next=${encodeURIComponent(next)}` : "/signup";

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <Link
            href="/"
            className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-lg font-bold text-accent-fg"
          >
            W
          </Link>
          <h1 className="text-xl font-semibold">WilsTracker</h1>
          <p className="mt-1 text-sm text-muted">Sign in to your account</p>
        </div>

        {error && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <LoginForm next={next} />
        </div>

        <p className="mt-6 text-center text-sm text-muted">
          New here?{" "}
          <Link href={signupHref} className="text-accent hover:underline">
            Create an account
          </Link>
        </p>
        <p className="mt-2 text-center text-xs text-muted">
          Recruiter accounts are created by an administrator.
        </p>
      </div>
    </main>
  );
}
