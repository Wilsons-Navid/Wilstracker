# What Makes a Good ATS — Research & Design Direction

Research date: 2026-06-25. Feeds into PLAN.md.

## 1. What makes a good ATS (the principles)

From recruiter feedback and 2026 market reports, the winners share five traits:

1. **Speed & low click-count.** The #1 complaint about legacy ATS is "click-heavy navigation"
   and slow systems. Good ATS minimize clicks to review/move a candidate. → Our Kanban drag = 1 gesture.
2. **Visual pipeline, not spreadsheets.** Seeing *where* every candidate is (applied → hired) at a
   glance beats buried tables. → Kanban is the core screen, correctly.
3. **Don't lose good candidates.** Bad resume parsing / data silos make recruiters miss talent.
   → Keep candidate data clean, searchable, with CV + LinkedIn always one click away.
4. **Automation of busy-work + light AI.** AI-augmented teams report ~55% faster time-to-hire.
   Even a small AI assist (CV scoring, summaries) is now an expectation, not a luxury.
   → Our bonus AI CV assessment is well-aligned.
5. **Fast to adopt.** Modern tools (Ashby, Workable) onboard in days; legacy (Greenhouse) takes months.
   "Speed-to-value" is itself a selling point. → Matches our "live for first customer ASAP" goal.

## 2. Features — mapped to our scope

### Must-have (in the test spec — build these well)
- Admin creates accounts (admin + customer)
- Customer login
- Post jobs
- Add candidates with profile info (LinkedIn link, etc.)
- Compact Kanban of candidates across the customer's jobs
- Filter Kanban by job + candidate name
- Admin can do all of the above on a customer's behalf

### High-value adds (cheap, big "ATS feel" — do if time allows, in priority order)
1. **Drag-and-drop stage changes** with an audit/last-moved timestamp (core ATS behavior)
2. **Candidate detail drawer/modal** — full profile, notes, CV link, LinkedIn, stage history
3. **AI CV assessment** (the bonus) — score + strengths + gaps vs the job
4. **Notes / comments** on a candidate (collaboration is a top recruiter need)
5. **Simple counts** per column (e.g. "Interview · 4") — lightweight analytics
6. **Search across all candidates** (not just per-board filter)
7. **Empty states + seed/demo data** so the live URL never looks broken in the demo

### Deliberately OUT of scope (note as assumptions, don't build)
- Job-board posting / careers page / public application form
- Resume parsing pipeline, email integrations, interview scheduling, offer letters
- Custom-per-job stages, advanced analytics dashboards, bulk actions, role permissions beyond admin/customer
- Mobile-native app (responsive web is enough)

## 3. Design styles & UX direction

**Recommended aesthetic: clean, modern B2B SaaS — "Linear / Ashby" school.**
- Light, airy, lots of whitespace; one calm accent color; neutral grays; subtle borders over heavy shadows.
- Tailwind + shadcn/ui component library (fast, consistent, looks professional out of the box).
- Inter (or Geist) typeface; restrained type scale; generous line-height.

**Concrete UX patterns to apply (from the research):**
- **Kanban board** = home screen for customers. Columns = stages; cards = candidates.
- **Candidate card (compact):** name, role/job tag, LinkedIn icon-link, AI score badge, stage color.
  Keep it scannable — proper spacing, distinct card format so it reads as a board.
- **Drag-and-drop** to move stages (1 gesture, instant optimistic update).
- **Filter bar** above the board: job dropdown + name search (live filter).
- **Detail drawer** slides in on card click — progressive disclosure (don't crowd the card).
- **List/row view option** later: each row shows CV link, LinkedIn, AI score, stage.
- **Top nav:** logo, search, "+ New job / + New candidate", account menu.
- **Admin "acting as" banner:** when an admin works on a customer's behalf, show a persistent
  banner ("Viewing as Acme Corp") so context is never ambiguous.
- **Color-coded stages** for instant visual parsing; column counts for light analytics.
- **Accessibility & responsive:** keyboard-operable, works on a laptop screen for the demo.

## 4. What this means for the demo (how it scores points)
- Open on the Kanban → instantly communicates "this is an ATS."
- Drag a candidate across stages → shows the core loop working.
- Filter by job + name → directly answers a spec requirement on camera.
- Run AI CV assessment on one candidate → the "wow" moment.
- Switch to admin "act as customer" → proves the permission model.

## Sources
- Lever — Modern ATS 2026: lever.co/blog/modern-applicant-tracking-systems-what-to-look-for-in-2026
- Greenhouse — best ATS software 2026: greenhouse.com/blog/best-ats-software
- Ashby vs Greenhouse comparison: ashbyhq.com/compare/ashby-vs-greenhouse
- Recruiter ATS complaints (Reddit roundup): curriculo.me/blogs/reddit-ats-complaints-2026
- Eleken — ATS design problems: eleken.co/blog-posts/5-common-hiring-problems-and-how-a-well-designed-ats-can-fix-them
- Eleken — ATS design how-to: eleken.co/blog-posts/applicant-tracking-system-design-how-to-make-recruitment-better-for-everyone
- SSR — ATS statistics 2026: selectsoftwarereviews.com/blog/applicant-tracking-system-statistics
