import "server-only";
import { headers } from "next/headers";

// Absolute origin of the current request (e.g. https://wilstracker.vercel.app).
// Built from forwarded headers so it's correct in dev (localhost) and prod.
export async function getOrigin(): Promise<string> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  return h.get("origin") ?? (host ? `${proto}://${host}` : "");
}
