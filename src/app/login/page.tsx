import LoginForm from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-lg font-bold text-accent-fg">
            A
          </div>
          <h1 className="text-xl font-semibold">Mini ATS</h1>
          <p className="mt-1 text-sm text-muted">Sign in to your workspace</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <LoginForm />
        </div>

        <p className="mt-4 text-center text-xs text-muted">
          Accounts are created by an administrator.
        </p>
      </div>
    </main>
  );
}
