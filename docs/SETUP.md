# Setup — WilsTracker

Step-by-step to get the app running locally. Do these in order.

## 0. Clone and install
```bash
git clone https://github.com/Wilsons-Navid/Wilstracker.git
cd Wilstracker
npm install
```
Requires Node 20+.

## 1. Create a Supabase project (browser)
1. Go to https://supabase.com → sign in → **New project**.
2. Name it `ats-mini`, pick a region close to you, set a strong database password (save it).
3. Wait ~2 min for it to provision.

## 2. Create the database schema
1. In the project, open **SQL Editor → New query**.
2. Paste the entire contents of `supabase/schema.sql` and click **Run**.
3. You should see "Success". This creates the tables, RLS policies, and triggers.

## 3. Get your API keys
1. **Project Settings → API**.
2. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** (under "Project API keys", reveal it) → `SUPABASE_SERVICE_ROLE_KEY`

## 4. Get an Anthropic API key (for the AI CV feature)
1. https://console.anthropic.com → **API Keys → Create Key**.
2. Copy it → `ANTHROPIC_API_KEY`.

## 5. Configure environment
1. In the project root, copy `.env.local.example` to `.env.local`.
2. Paste the four values from steps 3–4.

## 6. Create the storage buckets
Résumé and avatar uploads live in private Supabase Storage buckets. Create them:
```bash
node scripts/setup-storage.mjs
```
This makes the `resumes` and `avatars` buckets. Skip it and uploads will fail.

## 7. Seed the admin and demo data
```bash
node scripts/seed-demo.mjs
```
This creates a demo admin, two demo customers, and sample jobs and candidates so
the board has something in it. Re-running is safe; it refreshes the demo jobs and
candidates. These log into the database **you** just seeded, so they are local to
your own instance:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@example.com` | `tracker123` |
| Customer | `acme.recruiter@example.com` | `demo12345` |
| Customer | `globex.recruiter@example.com` | `demo12345` |

> The hosted demo at wilstracker.vercel.app uses its own separate admin
> credentials, shared privately rather than committed here.

**Alternative — bootstrap an admin by hand** (if you'd rather start with an empty
database): create a user in Supabase **Authentication → Users → Add user**
(enter an email and password, tick **Auto Confirm User**). The `handle_new_user`
trigger creates a matching `profiles` row, defaulting to `customer`. Promote it:
```sql
update public.profiles
set role = 'admin', full_name = 'Wilsons (Admin)'
where id = (select id from auth.users where email = 'you@example.com');
```

## 8. Run the app
```bash
npm run dev
```
Open http://localhost:3000 and log in with the demo admin from step 7 (or your own
account from the alternative).

> **Testing the candidate side locally.** The seed gives you admin and customer
> logins. To sign up as a candidate and use the portal, either turn off email
> confirmation in Supabase (**Authentication → Providers → Email**, untick
> "Confirm email") or, after signing up, confirm the user by hand in
> **Authentication → Users**. The hosted demo already has a candidate login if you
> just want to see the portal.

---

## Deploying to Vercel (later)
1. Push the repo to GitHub.
2. https://vercel.com → **New Project** → import the repo.
3. Add the same four env vars in **Settings → Environment Variables**.
4. Deploy. Add the production URL to Supabase **Authentication → URL Configuration** (Site URL + redirect URLs).
