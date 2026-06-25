import { requireAdmin } from "@/lib/dal";

export default async function AdminPage() {
  await requireAdmin();
  return (
    <div>
      <h1 className="text-lg font-semibold">Admin</h1>
      <p className="mt-1 text-sm text-muted">
        Account creation and acting on behalf of customers are coming next.
      </p>
    </div>
  );
}
