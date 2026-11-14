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
**The score comes from the Glowup scanner, not from you.** It is a program that reads the project and scores it the same way every time, with a file and line for every point lost. Find it and run it:

1. Find `glowup-scan.mjs`. Look, in this order, at `${CLAUDE_PLUGIN_ROOT}/features/glowup-scan.mjs` (plugin install), `~/.claude/glowup/glowup-scan.mjs` (script install), then anywhere under `~/.claude/plugins`. If it's nowhere, download it once: `mkdir -p ~/.claude/glowup && curl -fsSL https://raw.githubusercontent.com/drewguitarist18-lang/glowup/main/features/glowup-scan.mjs -o ~/.claude/glowup/glowup-scan.mjs`.
2. Run `node <scanner> . --json --save <snapshot>`, where `<snapshot>` is `.git/glowup-before.json` (or a file in the system temp folder if there is no `.git` yet). It never goes in the working tree.
3. Print the scorecard exactly as the scanner scored it: `node <scanner> .` prints it ready to show. Never change a number. A category the scanner marks `n/a` stays `n/a`.

Then add what a program can't see, under a heading **Also found (not scored)**: things you verified by reading or running the app, each with `path:line`. Typical ones: a route that checks sign-in but not ownership (one user can read another's data), business logic that is wrong, a UI that has none of the scanner's tells and still looks generated. These get fixed in their category too; they just don't move the number.

If Node isn't installed or the scanner can't run, say so in one line, score each category 0–10 by hand from the table below with `path:line` evidence, and label the result an estimate.

What each category means:

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

The scanner's output ends with the big line, like:
`Glow Score: 38/100 — Vibe Prototype`
Tiers: 0–39 🫧 Vibe Prototype · 40–59 🛠️ Side Project · 60–79 🚀 Launch-Ready · 80–89 💼 Professional · 90–100 🏆 Production Grade
If the scanner prints `Held at 79`, the app still looks generated: the score can't pass 79 until the UI polish findings are cleared (section 5).

If mode is `audit`: show the scanner's list of fixes worth the most (it is already in priority order), add your "Also found" items, and stop. Read only the files the findings point at; an audit should cost almost nothing.

## 3. Safety net
Before changing anything:
- If it's a git repo: make sure the working tree is committed (ask if there are uncommitted changes), then `git checkout -b glowup`.
- If it's not a git repo: `git init` and commit the current state as "before glow up".
Tell the user they can undo everything with `git checkout -` (or by deleting the branch).

## 4. Fix, one category at a time
Go in the table's order, 1 → 10. For **each** category, in this loop:

1. Start from the scanner's findings for that category (each has the files and lines) and your "Also found" items, and make focused, real changes for that category only. Fix the cause, not the pattern the scanner matched: deleting a `catch` to clear "empty catch", or renaming a variable to hide a secret, is cheating and makes the app worse. Match the existing stack; don't rewrite it in a new framework. If a later category's work is tangled in (e.g. moving files while fixing the API), do the minimum now and finish it in its own turn.
2. Prove the app still works: run the build/tests/lint that exist, **and** smoke-test the running app: start it, hit the health or home route, and run the main flow from recon (sign up or log in, create the main thing, read it back). Fix anything broken before moving on.
3. Commit: `glowup: <category> — <short summary>`. One commit per category, ten in all for a full run, so each can be reviewed or reverted alone. Never fold two categories into one commit (a message like `glowup: structure + UI polish` means you did it wrong); if a category needs nothing, skip it and say so.
4. Run the scanner again and print one line with its numbers: `✅ Security 2 → 8 — moved keys to .env, added auth middleware, parameterized queries`. If the category's score didn't go up, read what the scanner still reports there and fix that before moving on, or say plainly why it can't be fixed.

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

**Look at it and iterate.** Run the app and view every page at desktop (1440 px) and phone (375 px) width (screenshot if you can). Ask: would this pass for a funded startup's product? Does any item from the strip list remain? Is anything misaligned, cramped, clipped or default-looking? Does any page scroll sideways? Fix what you see and look again. Do at least two rounds before you commit this category.

**It isn't done until all of this is true.** Don't commit UI polish, and don't print the AFTER scorecard, before it is:
- The scanner reports none of `gradient-look`, `emoji-icons`, `hype-copy`, `glass-cards`, `default-font` or `template-look`. While any of them is left it holds UI polish at 5 and the whole score at 79, on purpose: an app that still looks like a template isn't Professional, whatever is under the hood.
- UI polish scores 9 or 10.
- You looked at every page at both widths after your last change, and nothing is clipped, overlapping or scrolling sideways.
- It is its own commit, `glowup: UI polish — <the direction you chose>`, with nothing from another category in it.

If you couldn't run the app or take screenshots, say so in the report and call the look unverified; don't claim it.

## 6. Scorecard — AFTER
Run `node <scanner> . --before <snapshot>`: it prints before and after side by side, what got fixed and what is still open. Show it as printed. For anything still open, say in a line why (needs a decision, out of scope, would change what the app does). Then list which "Also found" items you fixed and which remain. It looks like this:

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
