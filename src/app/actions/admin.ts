"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/lib/dal";
import { createAdminClient } from "@/lib/supabase/admin";
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

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role },
  });

  if (error) {
    if (/exists|registered/i.test(error.message)) {
      return { error: "An account with that email already exists." };
    }
    return { error: error.message };
  }

  // Record who created the account (the trigger creates the profile row).
  await admin
    .from("profiles")
    .update({ created_by: me.id })
    .eq("id", data.user.id);

  revalidatePath("/admin");
  return { ok: true, message: `Created ${role} account for ${email}.` };
}
