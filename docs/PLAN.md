# Mini ATS — Coding Test Plan

**Owner:** Wilsons (w.wadotiwa@alustudent.com)
**Date started:** 2026-06-25 · **Deadline:** ~2026-07-02 (1 week)

## What the test is really judging
The interviewer said it twice: *"how you work"* and *"how you think during the build."*
Win condition = **clean repo + sensible documented assumptions + confident 5-min demo**, shipped fast.

## Deliverables checklist
- [ ] Admin login access shared with interviewer
- [ ] 5-minute Loom demo video
- [ ] Repo link
- [ ] Email listing assumptions made
- [ ] (Bonus) AI-based CV assessment feature

## Recommended stack
**Next.js + Supabase + Vercel**, built with Claude Code.
- Server actions run the service-role key safely (needed for admin-create-user).
- Clean repo demonstrates engineering ability.
- Vercel live URL + GitHub repo cover two delivery items directly.
- Alt: Lovable (fastest to live URL, but Vite not Next.js, needs an Edge Function for admin-create-user).

## The key architectural constraint
"Admin can create accounts" needs `auth.admin.createUser()` → requires the **service-role key**, which
must run **server-side only** (Next.js server action / route, or Supabase Edge Function). Never in the browser.

## Data model
| Table | Key columns | Purpose |
|---|---|---|
| profiles | id→auth.users, full_name, role ('admin'\|'customer'), created_by | identity + role |
| jobs | id, owner_id→profiles, title, description, location, status, created_at | postings |
| candidates | id, owner_id, job_id→jobs, full_name, email, linkedin_url, resume_url, stage, notes, created_at | candidates |
| cv_assessments | candidate_id, score, summary, strengths, gaps, raw_json | AI feature |

- Kanban columns = `candidates.stage`: applied → screening → interview → offer → hired / rejected.
- Drag card between columns = UPDATE stage.
- Filters: by job + by candidate name (client-side over loaded rows).

## RLS (row level security)
- Customers: `owner_id = auth.uid()` for SELECT/INSERT/UPDATE/DELETE.
- Admins: `is_admin()` SECURITY DEFINER function (or JWT claim) bypasses ownership.
- "Admin on behalf of customer": admin picks a customer; rows created with that customer's owner_id. No separate code path.

## Kanban
- Use `@dnd-kit` (react-beautiful-dnd is unmaintained).
- Reference: github.com/Georgegriff/react-dnd-kit-tailwind-shadcn-ui

## AI CV assessment (bonus)
- Input: CV text (paste or upload to Supabase Storage) + the job description.
- Call Claude with **forced structured output** (tool_choice) → `{score, strengths[], gaps[], recommendation}`.
- Prompt uses `<job_description>` and `<candidate>` XML tags.
- Store result in cv_assessments; show on candidate card.
- Stripped-down minimum = one server function. Model: claude-haiku-4-5 (cheap/fast) or sonnet.

## 1-week schedule
- Day 1 (6/25): Supabase project, schema + RLS, auth, repo, deploy skeleton (live URL early)
- Day 2: Login, profiles, admin create-account server function, role-based routing
- Day 3: Jobs CRUD (+ admin on-behalf)
- Day 4: Candidates CRUD + Kanban with drag-between-stages
- Day 5: Filters + admin "act as customer" + polish / empty states
- Day 6: AI CV assessment
- Day 7: Seed demo data, record Loom, write assumptions email, buffer

## Assumptions to document in the email (draft as we go)
- Self-serve signup disabled; accounts are admin-created only (matches spec).
- Fixed pipeline stages for MVP (custom-per-job stages = future work).
- One customer = one recruiting org (single-user tenant) for MVP.
- LinkedIn URL is the primary candidate profile field; resume upload optional.
- AI assessment is advisory, not auto-rejecting (bias/fairness note).

## Sources
- Supabase admin createUser: supabase.com/docs/reference/javascript/auth-admin-createuser
- Securing Edge Functions: supabase.com/docs/guides/functions/auth
- RLS best practices: makerkit.dev/blog/tutorials/supabase-rls-best-practices
- dnd-kit Kanban reference: github.com/Georgegriff/react-dnd-kit-tailwind-shadcn-ui
- CV analyser with Claude: topictrick.com/blog/build-cv-resume-analyser-claude
