# Glowup

A Claude Code command that turns a vibe-coded app into a professional one. A scanner scores your project out of 100 across ten categories, Claude fixes the worst ones in priority order, and the scanner scores it again. Every change lands on its own git branch, so you can undo it.

The score comes from code, not from the model: `features/glowup-scan.mjs` is a plain Node script with no dependencies. The same project always gets the same score, every point lost names a file and a line, and an audit costs almost no tokens.

Site: https://glowup-swart-nu.vercel.app (mirror: https://drewguitarist18-lang.github.io/glowup/)

## Install

Easiest, inside Claude Code:

```
/plugin install glowup --marketplace drewguitarist18-lang/glowup
```

On older Claude Code versions, run `/plugin marketplace add drewguitarist18-lang/glowup` first, then `/plugin install glowup@glowup`. The repo root is the plugin: `.claude-plugin/plugin.json` points at `features/glowup.md`, so there is only one copy of the command, and the scanner sits next to it.

Or with a script. Windows (PowerShell):

```powershell
irm https://raw.githubusercontent.com/drewguitarist18-lang/glowup/main/install.ps1 | iex
```

macOS, Linux, or Git Bash:

```bash
curl -fsSL https://raw.githubusercontent.com/drewguitarist18-lang/glowup/main/install.sh | bash
```

This copies each stable feature into `~/.claude/commands/` and the scanner into `~/.claude/glowup/`. Restart Claude Code if it was open.

Or download a double-click installer from the site: [Windows](https://glowup-swart-nu.vercel.app/downloads/Install-Glowup.cmd) (`Install-Glowup.cmd`, runs `install.ps1`) or [Mac](https://glowup-swart-nu.vercel.app/downloads/Install-Glowup-mac.zip) (a zipped `Install Glowup.command`). The Mac zip is built from `installers/` by `python tools/build_installers.py`, which keeps the file executable.

## Use

In any project:

- `/glowup audit`: scorecard and a prioritized plan. Changes nothing.
- `/glowup`: full glow up (audit, fix, re-score).
- `/glowup security`: fix only one category.

The scanner also runs on its own, with no Claude at all (Node 18 or newer):

```bash
node ~/.claude/glowup/glowup-scan.mjs .                 # the scorecard and the fixes worth the most
node ~/.claude/glowup/glowup-scan.mjs . --json          # the same as JSON
node ~/.claude/glowup/glowup-scan.mjs . --save a.json   # keep a snapshot
node ~/.claude/glowup/glowup-scan.mjs . --before a.json # before and after
```

It checks what a program can be sure of (a key in the code, a query in a loop, no tests, no CI, a 1,200-line file). What takes judgment, like whether one user can read another's data or whether the UI looks designed, `/glowup` adds on top without changing the number.

## Repo layout

```
features/         the commands, the scanner (glowup-scan.mjs), plus features.json (the registry)
install.ps1       Windows installer
install.sh        macOS / Linux installer
site/             the website (index.html, styles.css, site.js)
tools/validate.mjs  checks the registry; run before pushing
tools/scan-test.mjs tests the scanner on a made-up mess and a clean app
```

## Add a feature

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Develop locally

The installers read the feature list from `features/features.json` on `main`, so registry edits reach users once they're pushed. Check them with the validator, and preview the site locally:

```bash
node tools/validate.mjs
node tools/scan-test.mjs
npx serve site
```

## Deploy

GitHub Pages publishes `site/` on every push to `main`. Vercel doesn't (its GitHub app can't see this repo), so deploy it from `site/`:

```bash
cd site
npx vercel deploy --prod
```
