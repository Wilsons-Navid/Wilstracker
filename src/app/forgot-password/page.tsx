import Link from "next/link";
import ForgotPasswordForm from "@/components/auth/forgot-password-form";
import Logo from "@/components/ui/logo";

export const metadata = { title: "Reset your password — WilsTracker" };

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <Link href="/" className="mx-auto mb-3 block w-fit">
            <Logo />
          </Link>
          <p className="mt-4 text-sm text-muted">
            Enter your email and we&apos;ll send you a link to reset your
            password.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <ForgotPasswordForm />
        </div>

        <p className="mt-6 text-center text-sm text-muted">
          Remembered it?{" "}
          <Link href="/login" className="text-accent hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
