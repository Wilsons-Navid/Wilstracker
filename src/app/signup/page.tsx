import Link from "next/link";
import SignUpForm from "@/components/auth/signup-form";

export const metadata = { title: "Create your account — WilsTracker" };

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-lg font-bold text-accent-fg">
            W
          </div>
          <h1 className="text-xl font-semibold">Create your account</h1>
          <p className="mt-1 text-sm text-muted">
            Apply to roles and track your applications in one place.
          </p>
        </div>

        <SignUpForm />

        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link href="/login" className="text-accent hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
