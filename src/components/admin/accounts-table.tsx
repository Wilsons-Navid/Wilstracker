"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import AccountRow from "@/components/admin/account-row";
import type { Profile, UserRole } from "@/lib/types";

type Entry = { account: Profile; email: string };

const inputCls =
  "rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20";

export default function AccountsTable({
  accounts,
  currentUserId,
}: {
  accounts: Entry[];
  currentUserId: string;
}) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<UserRole | "all">("all");
  const [location, setLocation] = useState("all");

  // Distinct, non-empty locations for the dropdown.
  const locations = useMemo(() => {
    const set = new Set<string>();
    for (const { account } of accounts) {
      if (account.location) set.add(account.location);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [accounts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return accounts.filter(({ account, email }) => {
      if (role !== "all" && account.role !== role) return false;
      if (location !== "all" && account.location !== location) return false;
      if (!q) return true;
      const haystack = [
        account.full_name ?? "",
        email,
        account.description ?? "",
        account.location ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [accounts, query, role, location]);

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-semibold">
          Accounts{" "}
          <span className="text-sm font-normal text-muted">
            ({filtered.length}
            {filtered.length !== accounts.length && ` of ${accounts.length}`})
          </span>
        </h2>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, email, description…"
              className={`${inputCls} pl-8 sm:w-64`}
            />
          </div>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole | "all")}
            className={inputCls}
            aria-label="Filter by role"
          >
            <option value="all">All roles</option>
            <option value="admin">Admin</option>
            <option value="customer">Customer</option>
            <option value="candidate">Candidate</option>
          </select>
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className={inputCls}
            aria-label="Filter by location"
            disabled={locations.length === 0}
          >
            <option value="all">All locations</option>
            {locations.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </div>
      </div>

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
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-muted">
                  No accounts match your filters.
                </td>
              </tr>
            ) : (
              filtered.map(({ account, email }) => (
                <AccountRow
                  key={account.id}
                  account={account}
                  email={email}
                  currentUserId={currentUserId}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
