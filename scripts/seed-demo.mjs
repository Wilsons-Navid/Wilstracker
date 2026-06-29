// Seed script: creates the admin, demo customers, and sample jobs/candidates.
// Usage: node scripts/seed-demo.mjs
// Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local.
// Idempotent: re-running re-creates demo jobs/candidates for the demo customers.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- load .env.local ---
const envText = readFileSync(join(__dirname, "..", ".env.local"), "utf8");
const env = {};
for (const line of envText.split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].trim();
}

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing Supabase URL or service role key in .env.local");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// --- helpers ---
async function ensureUser({ email, password, full_name, role }) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role },
  });
  if (error) {
    if (
      error.code === "email_exists" ||
      /already.*registered|exists/i.test(error.message)
    ) {
      // Find the existing user by paging through the list.
      let page = 1;
      for (;;) {
        const { data: list, error: e2 } = await admin.auth.admin.listUsers({
          page,
          perPage: 200,
        });
        if (e2) throw e2;
        const found = list.users.find((u) => u.email === email);
        if (found) {
          console.log(`• user exists: ${email} (${found.id})`);
          return found.id;
        }
        if (list.users.length < 200) break;
        page += 1;
      }
      throw new Error(`User ${email} reported existing but not found`);
    }
    throw error;
  }
  console.log(`✓ created user: ${email} (${data.user.id})`);
  return data.user.id;
}

// Ensure the profile row has the intended role/name (trigger may default it).
async function fixProfile(id, full_name, role) {
  const { error } = await admin
    .from("profiles")
    .upsert({ id, full_name, role }, { onConflict: "id" });
  if (error) throw error;
}

async function main() {
  // 1) Admin (neutral demo identity — this seeds YOUR local database only)
  const adminId = await ensureUser({
    email: "admin@example.com",
    password: "tracker123",
    full_name: "Wilsons (Admin)",
    role: "admin",
  });
  await fixProfile(adminId, "Wilsons (Admin)", "admin");

  // 2) Demo customers
  const acmeId = await ensureUser({
    email: "acme.recruiter@example.com",
    password: "demo12345",
    full_name: "Acme Corp",
    role: "customer",
  });
  await fixProfile(acmeId, "Acme Corp", "customer");

  const globexId = await ensureUser({
    email: "globex.recruiter@example.com",
    password: "demo12345",
    full_name: "Globex Inc",
    role: "customer",
  });
  await fixProfile(globexId, "Globex Inc", "customer");

  // 3) Clean previous demo data for these customers (idempotent re-seed)
  for (const owner of [acmeId, globexId]) {
    await admin.from("candidates").delete().eq("owner_id", owner);
    await admin.from("jobs").delete().eq("owner_id", owner);
  }

  // 4) Jobs
  const jobsSpec = [
    { owner: acmeId, title: "Senior Frontend Engineer", location: "Remote (EU)", description: "React/TypeScript, design systems, 5+ yrs." },
    { owner: acmeId, title: "Product Designer", location: "Lagos, NG", description: "End-to-end product design, Figma, B2B SaaS." },
    { owner: globexId, title: "Data Analyst", location: "Remote (Africa)", description: "SQL, dashboards, experimentation." },
    { owner: globexId, title: "Backend Engineer (Go)", location: "Nairobi, KE", description: "Go, Postgres, distributed systems." },
  ];
  const { data: jobs, error: jobsErr } = await admin
    .from("jobs")
    .insert(jobsSpec.map(({ owner, title, location, description }) => ({
      owner_id: owner, title, location, description, status: "open",
    })))
    .select();
  if (jobsErr) throw jobsErr;
  console.log(`✓ inserted ${jobs.length} jobs`);

  const jobByTitle = Object.fromEntries(jobs.map((j) => [j.title, j]));

  // 5) Candidates across stages
  const c = (job, full_name, stage, linkedin, extra = {}) => ({
    owner_id: job.owner_id,
    job_id: job.id,
    full_name,
    stage,
    linkedin_url: linkedin,
    email: full_name.toLowerCase().replace(/[^a-z]+/g, ".") + "@example.com",
    ...extra,
  });

  const fe = jobByTitle["Senior Frontend Engineer"];
  const pd = jobByTitle["Product Designer"];
  const da = jobByTitle["Data Analyst"];
  const be = jobByTitle["Backend Engineer (Go)"];

  const candidates = [
    c(fe, "Amara Okafor", "applied", "https://linkedin.com/in/amaraokafor", {
      resume_text:
        "Frontend engineer, 6 years. React, TypeScript, Next.js. Led design-system rebuild at a fintech, improving Lighthouse scores 40%. BSc Computer Science.",
    }),
    c(fe, "Liam Chen", "screening", "https://linkedin.com/in/liamchen"),
    c(fe, "Sofia Rossi", "interview", "https://linkedin.com/in/sofiarossi", {
      resume_text:
        "Senior FE dev, 8 years. React, Vue, accessibility champion. Mentored 5 juniors. Shipped a component library used across 12 teams.",
    }),
    c(fe, "Daniel Mwangi", "offer", "https://linkedin.com/in/danielmwangi"),
    c(pd, "Ngozi Eze", "applied", "https://linkedin.com/in/ngozieze"),
    c(pd, "Tom Becker", "screening", "https://linkedin.com/in/tombecker"),
    c(pd, "Priya Nair", "hired", "https://linkedin.com/in/priyanair"),
    c(da, "Kwame Mensah", "applied", "https://linkedin.com/in/kwamemensah", {
      resume_text:
        "Data analyst, 3 years. SQL, Python, Looker. Built churn dashboard that cut reporting time 70%. Ran A/B tests for growth team.",
    }),
    c(da, "Elena Petrova", "interview", "https://linkedin.com/in/elenapetrova"),
    c(da, "Joseph Banda", "rejected", "https://linkedin.com/in/josephbanda"),
    c(be, "Fatima Sow", "screening", "https://linkedin.com/in/fatimasow"),
    c(be, "Marcus Lee", "interview", "https://linkedin.com/in/marcuslee", {
      resume_text:
        "Backend engineer, 5 years. Go, gRPC, Postgres, Kafka. Scaled payments service to 10k rps. Open-source contributor.",
    }),
    c(be, "Aisha Bello", "offer", "https://linkedin.com/in/aishabello"),
  ];

  const { data: cand, error: candErr } = await admin
    .from("candidates")
    .insert(candidates)
    .select();
  if (candErr) throw candErr;
  console.log(`✓ inserted ${cand.length} candidates`);

  console.log("\nDone. Logins:");
  console.log("  ADMIN     admin@example.com / tracker123");
  console.log("  CUSTOMER  acme.recruiter@example.com / demo12345");
  console.log("  CUSTOMER  globex.recruiter@example.com / demo12345");
}

main().catch((e) => {
  console.error("SEED FAILED:", e.message ?? e);
  process.exit(1);
});
