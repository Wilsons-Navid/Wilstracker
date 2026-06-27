// Creates the private "resumes" Storage bucket used for candidate CV uploads.
// Usage: node scripts/setup-storage.mjs   (idempotent — safe to re-run)
// Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envText = readFileSync(join(__dirname, "..", ".env.local"), "utf8");
const env = {};
for (const line of envText.split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].trim().replace(/^"|"$/g, "");
}

const supa = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const BUCKETS = [
  {
    name: "resumes",
    label: "private bucket (5MB, pdf/doc/docx)",
    options: {
      public: false,
      fileSizeLimit: "5MB",
      allowedMimeTypes: [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ],
    },
  },
  {
    name: "avatars",
    label: "public bucket (2MB, png/jpeg/webp/gif)",
    options: {
      public: true,
      fileSizeLimit: "2MB",
      allowedMimeTypes: [
        "image/png",
        "image/jpeg",
        "image/webp",
        "image/gif",
      ],
    },
  },
];

for (const { name, label, options } of BUCKETS) {
  const { error } = await supa.storage.createBucket(name, options);
  if (error && !/already exists/i.test(error.message)) {
    console.error(`FAILED (${name}):`, error.message);
    process.exit(1);
  }
  // Ensure config is applied even if the bucket already existed.
  await supa.storage.updateBucket(name, options);
  console.log(`OK: "${name}" ready — ${label}.`);
}
