"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Ban, RotateCcw } from "lucide-react";
import {
  updateAccount,
  setAccountActive,
} from "@/app/actions/admin";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import Avatar from "@/components/ui/avatar";
import type { Profile, UserRole } from "@/lib/types";

const inputCls =
  "rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20";

type Dialog = "save" | "deactivate" | "reactivate" | null;

export default function AccountRow({
  account,
  email: initialEmail,
  currentUserId,
}: {
  account: Profile;
  email: string;
  currentUserId: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(account.full_name ?? "");
  const [email, setEmail] = useState(initialEmail);
  const [role, setRole] = useState<UserRole>(account.role);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const isSelf = account.id === currentUserId;
  const promotingToAdmin = role === "admin" && account.role !== "admin";

  function save() {
    setError(null);
    const fd = new FormData();
    fd.set("user_id", account.id);
    fd.set("full_name", fullName);
    fd.set("email", email.trim());
    fd.set("role", role);
    if (promotingToAdmin) fd.set("confirm_email", email.trim());
    start(async () => {
      const res = await updateAccount(undefined, fd);
      if (res && "error" in res) {
        setError(res.error);
      } else {
        setDialog(null);
        setEditing(false);
        router.refresh();
      }
    });
  }

  function toggleActive(active: boolean) {
    setError(null);
    start(async () => {
      const res = await setAccountActive(account.id, active);
      if (res.error) {
        setError(res.error);
      } else {
        setDialog(null);
        router.refresh();
      }
    });
  }

  if (editing) {
    return (
      <tr className="border-b border-border/60">
        <td colSpan={5} className="py-3">
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-background p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted">Name</label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  disabled={isSelf}
                  className={inputCls}
                >
                  <option value="customer">customer</option>
                  <option value="admin">admin</option>
                </select>
              </div>
            </div>

            {error && !dialog && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDialog("save")}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg hover:opacity-90"
              >
                Save changes
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setError(null);
                  setFullName(account.full_name ?? "");
                  setEmail(initialEmail);
                  setRole(account.role);
                }}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-surface"
              >
                Cancel
              </button>
            </div>
          </div>

          {dialog === "save" && (
            <ConfirmDialog
              title={promotingToAdmin ? "Grant admin access" : "Save changes"}
              danger={false}
              confirmLabel={promotingToAdmin ? "Grant admin" : "Save"}
              requireText={promotingToAdmin ? email.trim() : undefined}
              requireTextLabel={
                promotingToAdmin
                  ? "Type the account's email to confirm"
                  : undefined
              }
              pending={pending}
              error={error}
              message={
                promotingToAdmin
                  ? `This gives ${fullName || "this account"} full admin access to every customer's data.`
                  : `Apply these changes to ${fullName || "this account"}?`
              }
              onConfirm={save}
              onCancel={() => {
                setDialog(null);
                setError(null);
              }}
            />
          )}
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-border/60 transition hover:bg-background/40">
      <td className="py-2.5">
        <div className="flex items-center gap-2.5">
          <Avatar name={account.full_name ?? "?"} photoUrl={null} size="sm" />
          <span className="font-medium">{account.full_name ?? "—"}</span>
        </div>
      </td>
      <td className="py-2.5 text-muted">{initialEmail}</td>
      <td className="py-2.5">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            account.role === "admin"
              ? "bg-accent/10 text-accent"
              : "bg-background text-muted"
          }`}
        >
          {account.role}
        </span>
      </td>
      <td className="py-2.5">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
            account.active
              ? "bg-emerald-50 text-emerald-700"
              : "bg-rose-50 text-rose-700"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              account.active ? "bg-emerald-500" : "bg-rose-500"
            }`}
          />
          {account.active ? "Active" : "Deactivated"}
        </span>
      </td>
      <td className="py-2.5">
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1 text-sm text-muted transition hover:text-foreground"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
          {account.active ? (
            <button
              type="button"
              onClick={() => setDialog("deactivate")}
              disabled={isSelf}
              title={isSelf ? "You can't deactivate yourself" : ""}
              className="inline-flex items-center gap-1 text-sm text-muted transition hover:text-red-600 disabled:opacity-40"
            >
              <Ban className="h-3.5 w-3.5" />
              Deactivate
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setDialog("reactivate")}
              className="inline-flex items-center gap-1 text-sm text-muted transition hover:text-emerald-600"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reactivate
            </button>
          )}
        </div>

        {dialog === "deactivate" && (
          <ConfirmDialog
            title="Deactivate account"
            danger
            confirmLabel="Deactivate"
            pending={pending}
            error={error}
            message={`${account.full_name ?? "This account"} will be signed out and blocked from logging in.`}
            onConfirm={() => toggleActive(false)}
            onCancel={() => {
              setDialog(null);
              setError(null);
            }}
          />
        )}
        {dialog === "reactivate" && (
          <ConfirmDialog
            title="Reactivate account"
            confirmLabel="Reactivate"
            pending={pending}
            error={error}
            message={`${account.full_name ?? "This account"} will be able to log in again.`}
            onConfirm={() => toggleActive(true)}
            onCancel={() => {
              setDialog(null);
              setError(null);
            }}
          />
        )}
      </td>
    </tr>
  );
}
