import { Users, Shield, Briefcase, Ban } from "lucide-react";
import { requireAdmin } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import CreateAccountForm from "@/components/admin/create-account-form";
import AccountRow from "@/components/admin/account-row";
import type { Profile } from "@/lib/types";

export default async function AdminPage() {
  const me = await requireAdmin();

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

  const adminsN = accounts.filter((a) => a.role === "admin").length;
  const customersN = accounts.filter((a) => a.role === "customer").length;
  const deactivatedN = accounts.filter((a) => !a.active).length;
  const stats = [
    { label: "Total accounts", value: accounts.length, Icon: Users, alert: false },
    { label: "Admins", value: adminsN, Icon: Shield, alert: false },
    { label: "Customers", value: customersN, Icon: Briefcase, alert: false },
    { label: "Deactivated", value: deactivatedN, Icon: Ban, alert: deactivatedN > 0 },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(({ label, value, Icon, alert }) => (
          <div
            key={label}
            className={`rounded-2xl border p-4 shadow-sm ${
              alert ? "border-rose-200 bg-rose-50" : "border-border bg-surface"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-muted">
                {label}
              </span>
              <Icon
                className={`h-4 w-4 ${alert ? "text-rose-500" : "text-muted"}`}
              />
            </div>
            <div
              className={`mt-2 text-2xl font-semibold ${
                alert ? "text-rose-700" : "text-foreground"
              }`}
            >
              {value}
            </div>
          </div>
        ))}
      </div>

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
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <AccountRow
                  key={a.id}
                  account={a}
                  email={emailById.get(a.id) ?? "—"}
                  currentUserId={me.id}
                />
              ))}
            </tbody>
          </table>
        </div>
        </div>
      </div>
    </div>
  );
}
