import { requireAdmin } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import CreateAccountForm from "@/components/admin/create-account-form";
import type { Profile } from "@/lib/types";

export default async function AdminPage() {
  await requireAdmin();

  const supabase = await createClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });

  // Emails live in auth.users — fetch with the service-role client (admin only).
  const admin = createAdminClient();
  const { data: userList } = await admin.auth.admin.listUsers({ perPage: 200 });
  const emailById = new Map(userList.users.map((u) => [u.id, u.email ?? "—"]));

  const accounts = (profiles as Profile[]) ?? [];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
      <div>
        <CreateAccountForm />
      </div>

      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold">
          Accounts{" "}
          <span className="text-sm font-normal text-muted">
            ({accounts.length})
          </span>
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-muted">
                <th className="pb-2 font-medium">Name</th>
                <th className="pb-2 font-medium">Email</th>
                <th className="pb-2 font-medium">Role</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id} className="border-b border-border/60">
                  <td className="py-2.5 font-medium">{a.full_name ?? "—"}</td>
                  <td className="py-2.5 text-muted">{emailById.get(a.id)}</td>
                  <td className="py-2.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        a.role === "admin"
                          ? "bg-accent/10 text-accent"
                          : "bg-background text-muted"
                      }`}
                    >
                      {a.role}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
