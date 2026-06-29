"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/lib/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendAccountCreated } from "@/lib/email";
import type { UserRole } from "@/lib/types";

export type CreateAccountState =
  | { ok: true; message: string }
  | { error: string }
  | undefined;

export async function createAccount(
  _prev: CreateAccountState,
  formData: FormData,
): Promise<CreateAccountState> {
  // Server Actions are public endpoints — verify the caller is an admin.
  const me = await getProfile();
  if (!me || me.role !== "admin") {
    return { error: "Only admins can create accounts." };
  }

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const role = String(formData.get("role") ?? "customer") as UserRole;
  const description = String(formData.get("description") ?? "").trim() || null;
  const location = String(formData.get("location") ?? "").trim() || null;

  if (!email || !password || !fullName) {
    return { error: "Name, email, and password are all required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (role !== "admin" && role !== "customer") {
    return { error: "Invalid role." };
  }

  const admin = createAdminClient();

  // Role goes in app_metadata, NOT user_metadata: app_metadata is settable only
  // through this service-role admin API, so the handle_new_user trigger can
  // trust it. A public self-signup can spoof user_metadata but never this.
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
    app_metadata: { role },
  });

  if (error) {
    if (/exists|registered/i.test(error.message)) {
      return { error: "An account with that email already exists." };
    }
    return { error: error.message };
  }

  // Record who created the account and any customer context (the trigger
  // creates the profile row; description/location are admin-supplied details).
  await admin
    .from("profiles")
    .update({ created_by: me.id, description, location })
    .eq("id", data.user.id);

  // Let the new user know their account exists (best-effort; never blocks).
  await sendAccountCreated(email, fullName, role);

  revalidatePath("/admin");
  return { ok: true, message: `Created ${role} account for ${email}.` };
}

export type UpdateAccountState =
  | { ok: true; message: string }
  | { error: string }
  | undefined;

export async function updateAccount(
  _prev: UpdateAccountState,
  formData: FormData,
): Promise<UpdateAccountState> {
  const me = await getProfile();
  if (!me || me.role !== "admin") {
    return { error: "Only admins can manage accounts." };
  }

  const userId = String(formData.get("user_id") ?? "").trim();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "") as UserRole;
  const description = String(formData.get("description") ?? "").trim() || null;
  const location = String(formData.get("location") ?? "").trim() || null;
  const confirmEmail = String(formData.get("confirm_email") ?? "")
    .trim()
    .toLowerCase();

  if (!userId) return { error: "Missing account." };
  if (!fullName) return { error: "Name is required." };
  if (!email) return { error: "Email is required." };
  if (role !== "admin" && role !== "customer" && role !== "candidate") {
    return { error: "Invalid role." };
  }
  // An admin can't strip their own admin access (lockout guard).
  if (userId === me.id && role !== "admin") {
    return { error: "You can't remove your own admin access." };
  }

  const admin = createAdminClient();

  const { data: target } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  if (!target) return { error: "Account not found." };
  const currentRole = (target as { role: UserRole }).role;

  // Candidates and staff (admin/customer) are different worlds — a candidate has
  // a linked person row and applications, staff own jobs. Migrating across that
  // boundary here would leave dangling data, so block the flip and keep edits to
  // name/email/details only for candidate accounts.
  if (currentRole === "candidate" || role === "candidate") {
    if (currentRole !== role) {
      return {
        error:
          "Candidate accounts can't be converted to staff roles (or vice versa).",
      };
    }
  }

  const { data: authData } = await admin.auth.admin.getUserById(userId);
  const currentEmail = authData?.user?.email?.toLowerCase() ?? "";

  // Promoting to admin is sensitive — the admin must retype the account's email.
  if (role === "admin" && currentRole !== "admin" && confirmEmail !== email) {
    return {
      error: "To grant admin access, retype the account's email to confirm.",
    };
  }

  // Email lives in auth — update it there (service-role) if it changed.
  if (email !== currentEmail) {
    const { error: emailErr } = await admin.auth.admin.updateUserById(userId, {
      email,
      email_confirm: true,
    });
    if (emailErr) {
      if (/exists|registered/i.test(emailErr.message)) {
        return { error: "That email is already in use." };
      }
      return { error: emailErr.message };
    }
  }

  // Name + role live on the profile (is_admin() reads profiles.role).
  const { error: pErr } = await admin
    .from("profiles")
    .update({ full_name: fullName, role, description, location })
    .eq("id", userId);
  if (pErr) return { error: pErr.message };

  revalidatePath("/admin");
  return { ok: true, message: "Account updated." };
}

// Admin sets a new password for any account (customer or candidate) directly,
// without needing the recovery-email round trip. The admin then shares it with
// the account holder out of band.
export async function setAccountPassword(
  userId: string,
  newPassword: string,
): Promise<{ ok?: true; error?: string }> {
  const me = await getProfile();
  if (!me || me.role !== "admin") {
    return { error: "Only admins can manage accounts." };
  }
  if (!userId) return { error: "Missing account." };
  if (!newPassword || newPassword.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, {
    password: newPassword,
  });
  if (error) return { error: error.message };

  return { ok: true };
}

export async function setAccountActive(
  userId: string,
  active: boolean,
): Promise<{ error?: string }> {
  const me = await getProfile();
  if (!me || me.role !== "admin") {
    return { error: "Only admins can manage accounts." };
  }
  // Don't let an admin lock themselves out.
  if (userId === me.id) {
    return { error: "You can't deactivate your own account." };
  }

  const admin = createAdminClient();
  // Block (or restore) login at the auth layer. ~100-year ban == deactivated.
  const { error: banErr } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: active ? "none" : "876000h",
  });
  if (banErr) return { error: banErr.message };

  const { error: pErr } = await admin
    .from("profiles")
    .update({ active })
    .eq("id", userId);
  if (pErr) return { error: pErr.message };

  revalidatePath("/admin");
  return {};
}
