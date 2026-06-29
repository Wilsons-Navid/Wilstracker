import Link from "next/link";
import SignUpForm from "@/components/auth/signup-form";
import Logo from "@/components/ui/logo";

export const metadata = { title: "Create your account — WilsTracker" };

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const loginHref = next ? `/login?next=${encodeURIComponent(next)}` : "/login";

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="mx-auto mb-3 block w-fit">
            <Logo priority className="mx-auto h-auto w-40" />
          </Link>
          <h1 className="text-xl font-semibold">Create your account</h1>
          <p className="mt-1 text-sm text-muted">
            Apply to roles and track your applications in one place.
          </p>
        </div>

        <SignUpForm next={next} />

        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link href={loginHref} className="text-accent hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
