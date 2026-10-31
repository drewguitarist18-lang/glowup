# Glowup

A Claude Code command that turns a vibe-coded app into a professional one. It scores your project out of 100 across ten categories, fixes the worst ones in priority order, and scores it again. Every change lands on its own git branch, so you can undo it.

Site: https://glowup-swart-nu.vercel.app (mirror: https://drewguitarist18-lang.github.io/glowup/)

## Install

Windows (PowerShell):

```powershell
irm https://raw.githubusercontent.com/drewguitarist18-lang/glowup/main/install.ps1 | iex
```

macOS, Linux, or Git Bash:

```bash
curl -fsSL https://raw.githubusercontent.com/drewguitarist18-lang/glowup/main/install.sh | bash
```

This copies each stable feature into `~/.claude/commands/`. Restart Claude Code if it was open.

## Use

In any project:

- `/glowup audit`: scorecard and a prioritized plan. Changes nothing.
- `/glowup`: full glow up (audit, fix, re-score).
- `/glowup security`: fix only one category.

## Repo layout

```
features/         the commands, plus features.json (the registry)
install.ps1       Windows installer
install.sh        macOS / Linux installer
index.html        the website (styles.css, site.js)
tools/validate.mjs  checks the registry; run before pushing
```

## Add a feature

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Develop locally

The site loads `features/features.json` with `fetch`, so open it through a server rather than by double-clicking `index.html`:

```bash
node tools/validate.mjs
npx serve .
```

## Deploy

GitHub Pages redeploys on every push to `main`. Vercel doesn't (its GitHub app can't see this repo), so deploy it from this folder:

```bash
npx vercel deploy --prod
```

`.vercelignore` keeps `tools/` and `.github/` out of the upload.
