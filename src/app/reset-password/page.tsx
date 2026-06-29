import Link from "next/link";
import ResetPasswordForm from "@/components/auth/reset-password-form";
import Logo from "@/components/ui/logo";

export const metadata = { title: "Set a new password — WilsTracker" };

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <Link href="/" className="mx-auto mb-3 block w-fit">
            <Logo />
          </Link>
          <p className="mt-4 text-sm text-muted">Choose a new password.</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <ResetPasswordForm />
        </div>

        <p className="mt-6 text-center text-sm text-muted">
          <Link href="/login" className="text-accent hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
