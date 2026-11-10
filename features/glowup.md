---
description: Glow up a vibe-coded app into a professional one — score it, fix it, re-score it
argument-hint: [audit | <category> | blank for full glow up]
---

# ✨ GLOW UP

Mode: `$ARGUMENTS`
- blank → full glow up (audit → fix → re-score)
- `audit` → scorecard + plan only, change nothing
- a category name (e.g. `security`, `tests`, `ui`) → fix only that category

The goal: someone opens the app afterwards and it looks and behaves like a product a real team shipped. Same app, same features, same stack. A new backend behind a UI that still looks generated is not a glow up.

## 1. Recon (fast)
Detect the stack: language, framework, package manager, database, how it runs, how it deploys. Read the README, package/config files, entry points and folder tree. Don't read every file; in a big repo, sample the largest and most-imported files per area.

Then **run the app** and look at it: start it, open every page or screen, click through the main flow (sign up, create the main thing, see it listed). If you have a browser or screenshot tool, take screenshots and look at them; otherwise read the rendered HTML/CSS closely. Write down in two lines what the product is, who it's for, and what each page is for. You need this for the UI category.

## 2. Scorecard — BEFORE
Score each category 0–10 from what you actually found. Cite evidence (`path:line`) for every score under 7. If a category truly doesn't apply (no database, no UI), mark it `n/a` and score the total out of the remaining categories, scaled to 100.

| # | Category | What "10" looks like |
|---|---|---|
| 1 | 🔐 Security | no secrets in code, `.env` + `.env.example`, auth on private routes, users only see their own data, no SQL/XSS injection, CORS set |
| 2 | 🧱 Backend & API | consistent routes, input validation (zod/pydantic), proper status codes, no logic in route handlers |
| 3 | 🗄️ Database | real schema + migrations, indexes on lookups, no queries in loops, money as integers, connection handled once |
| 4 | 🧯 Error handling | errors caught at boundaries, user-friendly messages, nothing swallowed silently |
| 5 | 🗂️ Structure | clear folders (routes / services / data / ui), no 500-line god files, no dead code |
| 6 | 🔤 Types & quality | TypeScript/type hints, linter + formatter configured, no `any` soup |
| 7 | 🧪 Tests | tests for core logic + main API routes, one command runs them |
| 8 | 🚀 DevOps | CI runs lint + tests + build, reproducible setup, health check |
| 9 | 📈 Observability | structured logging, no stray `console.log` / `print`, request logging |
| 10 | 💅 UI polish | looks designed for this product (see section 5), honest copy, loading + empty + error states, responsive, accessible |

Print the table with scores and a **TOTAL /100**, then a big line like:
`Glow Score: 38/100 — 🫧 Vibe Prototype`
Tiers: 0–39 🫧 Vibe Prototype · 40–59 🛠️ Side Project · 60–79 🚀 Launch-Ready · 80–89 💼 Professional · 90–100 🏆 Production Grade

If mode is `audit`: list the top 10 fixes in priority order (biggest score gain per effort, security first) and stop.

## 3. Safety net
Before changing anything:
- If it's a git repo: make sure the working tree is committed (ask if there are uncommitted changes), then `git checkout -b glowup`.
- If it's not a git repo: `git init` and commit the current state as "before glow up".
Tell the user they can undo everything with `git checkout -` (or by deleting the branch).

## 4. Fix, one category at a time
Go in the table's order, 1 → 10. For **each** category, in this loop:

1. Make focused, real changes for that category only. Match the existing stack; don't rewrite it in a new framework. If a later category's work is tangled in (e.g. moving files while fixing the API), do the minimum now and finish it in its own turn.
2. Prove the app still works: run the build/tests/lint that exist, **and** smoke-test the running app: start it, hit the health or home route, and run the main flow from recon (sign up or log in, create the main thing, read it back). Fix anything broken before moving on.
3. Commit: `glowup: <category> — <short summary>`. One commit per category, ten in all for a full run, so each can be reviewed or reverted alone. Never fold two categories into one commit; if a category needs nothing, skip it and say so.
4. Print one line: `✅ Security 2 → 8 — moved keys to .env, added auth middleware, parameterized queries`.

Rules:
- Never delete user features, change what the app does, add paid services, or commit secrets.
- Existing data must survive: migrate it, don't drop it.
- If you found a real secret in the code or git history, moving it to `.env` isn't enough. Tell the user plainly in the report that it leaked and must be rotated.
- If a fix needs a decision only the user can make (e.g. which auth provider), pick the most standard free option, say so, and keep going.
- Big repo: fix the worst offenders in each category rather than touching every file, and say what you left.

## 5. UI polish is a design job
This is the category people see, and it's last so it gets the final word. Tidying the CSS doesn't count. Do it as a designer would:

**Keep every page's job.** A landing page stays a landing page, a dashboard stays a dashboard. Redesign them; don't delete the marketing page and leave a bare login form.

**Strip the generated look.** These mark an app as vibe-coded; remove every one you find:
- purple/pink gradient backgrounds, gradient text, glows, glassmorphism cards
- emoji used as icons or in headings and buttons (✨ 🚀 🔥)
- hype copy: "Revolutionize", "Supercharge", "Unlock", "AI-powered" on a product that has no AI
- claims the app can't back up ("bank-level security", fake testimonials, invented customer logos or numbers)
- three identical feature cards with an icon, a two-word title and one vague line
- dead links and nav items that go nowhere; unstyled default inputs and buttons

**Then design it for this product.**
- Direction: pick one that suits what the product is and who uses it, and state it in a line before you build (e.g. "calm, bookkeeping-grade: off-white, ink text, one green accent"). One accent colour, a neutral scale, and a deliberate font pairing with a distinct display face for headings. Don't settle for system-ui on a white card or a generic dark admin theme.
- Copy: say what the product does in plain, specific words a customer would use. The headline names the outcome ("Your invoices deserve to get paid on time"), the line under it says how. Buttons say what happens.
- Show the product: where a landing page had filler cards, show the real interface with realistic sample data (real-looking names, amounts, dates, statuses), built from the app's own components.
- System: a type scale, a spacing scale and shared tokens used everywhere, so pages look like one product. Strong hierarchy: one clear primary action per screen.
- The app itself: tables or lists with aligned numbers and status badges, forms with labels and inline errors, and real loading, empty and error states. Empty states say what to do next.
- Responsive down to a phone, visible focus, labelled controls, sufficient contrast.

**Look at it and iterate.** Run the app and view every page at desktop and phone width (screenshot if you can). Ask: would this pass for a funded startup's product? Does any item from the strip list remain? Is anything misaligned, cramped or default-looking? Fix what you see and look again. Do at least two rounds before you commit this category.

## 6. Scorecard — AFTER
Re-score honestly with the same rubric. An after-score needs evidence too: for each category give the `path` (or commit) that earns it, and name what's still missing if it's under 10. Don't score UI polish above 7 unless you looked at the running pages and nothing from the strip list remains. Show before/after side by side:

```
            BEFORE  AFTER
Security      2  →   8
Backend       4  →   9
...
──────────────────────
GLOW SCORE   38  →  86   🫧 Vibe Prototype → 💼 Professional
```

## 7. Report
End with:
- the scorecard above (it's the screenshot people share)
- what changed, 5–8 bullets, leading with what a user will see
- anything the user must do themselves (rotate a leaked key, set an env var)
- what's left to reach the next tier
- how to run it and see the result
- "Undo: `git checkout main && git branch -D glowup`" (use the real base branch name)
