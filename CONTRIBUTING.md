# Adding a feature

A feature is a Claude Code command. It's one Markdown file in `features/` and one entry in `features/features.json`. The installers and the website both read the registry, so you don't touch either of them.

## 1. Write the command

Create `features/<name>.md`. Start it with frontmatter that has a `description:` line:

```markdown
---
description: One line that says what the command does
argument-hint: [optional | args]
---

# Your command

Steps Claude should follow when the user types /<name>.
```

Use `$ARGUMENTS` where the user's text should go. `features/glowup.md` is a full example.

## 2. Register it

Add an entry to `features/features.json`:

```json
{
  "id": "my-feature",
  "name": "My Feature",
  "command": "my-feature",
  "file": "my-feature.md",
  "summary": "What it does, in a sentence or two.",
  "usage": "/my-feature  ·  /my-feature <arg>",
  "tags": ["tag-one", "tag-two"],
  "status": "stable"
}
```

- `command` is the slash name, lowercase with dashes.
- `file` is the file you wrote in step 1.
- `status`: `"stable"` ships it (installers copy it). `"planned"` lists it on the site without installing.

## 3. Check it

```bash
node tools/validate.mjs
```

It fails if an id or command is duplicated, a field is missing, the file is absent, or the frontmatter has no `description:`.

## 4. Ship it

Commit and push to `main`. The Pages workflow runs the same check, then publishes the site. Users pick the feature up by running the installer again.
