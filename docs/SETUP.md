# Setup — Mini ATS

Step-by-step to get the app running locally. Do these in order.

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

## 6. Create the first admin (bootstrap)
The app only lets admins create accounts — so the very first admin is made by hand.
1. Supabase **Authentication → Users → Add user → Create new user**.
   - Enter an email + password you control, tick **Auto Confirm User**.
2. The `handle_new_user` trigger creates a matching `profiles` row (defaults to `customer`).
3. Promote it to admin: **SQL Editor → New query**, run (replace the email):
   ```sql
   update public.profiles
   set role = 'admin', full_name = 'Wilsons (Admin)'
   where id = (select id from auth.users where email = 'you@example.com');
   ```

## 7. Run the app
```bash
npm run dev
```
Open http://localhost:3000 and log in with the admin credentials from step 6.

---

## Deploying to Vercel (later)
1. Push the repo to GitHub.
2. https://vercel.com → **New Project** → import the repo.
3. Add the same four env vars in **Settings → Environment Variables**.
4. Deploy. Add the production URL to Supabase **Authentication → URL Configuration** (Site URL + redirect URLs).
