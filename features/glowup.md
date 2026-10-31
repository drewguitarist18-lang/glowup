---
description: Glow up a vibe-coded app into a professional one — score it, fix it, re-score it
argument-hint: [audit | <category> | blank for full glow up]
---

# ✨ GLOW UP

Mode: `$ARGUMENTS`
- blank → full glow up (audit → fix → re-score)
- `audit` → scorecard + plan only, change nothing
- a category name (e.g. `security`, `tests`, `ui`) → fix only that category

## 1. Recon (fast)
Detect the stack: language, framework, package manager, database, how it runs, how it deploys. Read the README, package/config files, entry points and folder tree. Don't read every file.

## 2. Scorecard — BEFORE
Score each category 0–10 based on what you actually found. Cite evidence (`path:line`) for every score under 7.

| # | Category | What "10" looks like |
|---|---|---|
| 1 | 🗂️ Structure | clear folders (routes / services / data / ui), no 500-line god files, no dead code |
| 2 | 🔐 Security | no secrets in code, `.env` + `.env.example`, auth on private routes, no SQL/XSS injection, CORS set |
| 3 | 🧱 Backend & API | consistent REST/RPC routes, input validation (zod/pydantic), proper status codes, no logic in route handlers |
| 4 | 🗄️ Database | real schema + migrations, indexes on lookups, no queries in loops, connection handled once |
| 5 | 🧯 Error handling | errors caught at boundaries, user-friendly messages, nothing swallowed silently |
| 6 | 🔤 Types & quality | TypeScript/type hints, linter + formatter configured, no `any` soup |
| 7 | 🧪 Tests | tests for core logic + main API routes, one command runs them |
| 8 | 🚀 DevOps | CI (GitHub Actions) runs lint + tests + build, reproducible setup, health check |
| 9 | 📈 Observability | structured logging, no stray `console.log` / `print`, request logging |
| 10 | 💅 UI polish | consistent spacing/type/colors, loading + empty + error states, responsive, accessible labels |

Print the table with scores and a **TOTAL /100**, then a big line like:
`Glow Score: 38/100 — 🫧 Vibe Prototype`
Tiers: 0–39 🫧 Vibe Prototype · 40–59 🛠️ Side Project · 60–79 🚀 Launch-Ready · 80–89 💼 Professional · 90–100 🏆 Production Grade

If mode is `audit`: list the top 10 fixes in priority order (biggest score gain per effort, security first) and stop.

## 3. Safety net
Before changing anything:
- If it's a git repo: make sure the working tree is committed (ask if there are uncommitted changes), then `git checkout -b glowup`.
- If it's not a git repo: `git init` and commit the current state as "before glow up".
Tell the user they can undo everything with `git checkout -` (or by deleting the branch).

## 4. Fix (priority order)
Work through fixes in this order: Security → Backend & API → Database → Error handling → Structure → Types → Tests → DevOps → Observability → UI polish.

For each category:
- Make focused, real changes. Match the existing stack; don't rewrite it in a new framework.
- Keep the app working: after each category, run the build/tests/lint that exist. If something breaks, fix it before moving on.
- Commit after each category: `glowup: <category> — <short summary>`.
- Print one line per category: `✅ Security 2 → 8 — moved keys to .env, added auth middleware, parameterized queries`.

Never: delete user features, change what the app does, add paid services, or commit secrets. If a fix needs a decision only the user can make (e.g. which auth provider), pick the most standard free option, say so, and keep going.

## 5. Scorecard — AFTER
Re-score honestly with the same rubric. Show before/after side by side:

```
            BEFORE  AFTER
Security      2  →   8
Backend       4  →   9
...
──────────────────────
GLOW SCORE   38  →  86   🫧 Vibe Prototype → 💼 Professional
```

## 6. Report
End with:
- the scorecard above (it's the screenshot people share)
- what changed, 5–8 bullets
- what's left to reach the next tier
- "Undo: `git checkout main && git branch -D glowup`" (use the real base branch name)
