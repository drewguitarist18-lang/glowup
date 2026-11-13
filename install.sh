#!/usr/bin/env bash
# Installs every stable Glowup feature into your Claude Code commands folder.
# Run it in a terminal (macOS, Linux, or Git Bash on Windows):
#   curl -fsSL https://raw.githubusercontent.com/drewguitarist18-lang/glowup/main/install.sh | bash
#
# Needs curl and node (for reading features.json).

set -euo pipefail

BASE="https://raw.githubusercontent.com/drewguitarist18-lang/glowup/main/features"
DEST="${CLAUDE_HOME:-$HOME/.claude}/commands"

mkdir -p "$DEST"

# Each line of FEATURES is: <file> <command>, for stable features only; EXTRAS lines are: <file> <where under ~/.claude>.
MANIFEST="$(curl -fsSL "$BASE/features.json")"
EXTRAS="$(printf '%s' "$MANIFEST" | node -e '
  let raw = "";
  process.stdin.on("data", (d) => (raw += d)).on("end", () => {
    for (const f of JSON.parse(raw).features) {
      if (f.status === "stable") for (const e of f.extras || []) console.log(e.file + " " + e.to);
    }
  });
')"
FEATURES="$(printf '%s' "$MANIFEST" | node -e '
  let raw = "";
  process.stdin.on("data", (d) => (raw += d)).on("end", () => {
    for (const f of JSON.parse(raw).features) {
      if (f.status === "stable") console.log(f.file + " " + f.command);
    }
  });
')"

while read -r file command; do
  [ -z "$file" ] && continue
  curl -fsSL "$BASE/$file" -o "$DEST/$file"
  echo "Installed /$command -> $DEST/$file"
done <<< "$FEATURES"

# what the commands run (the scanner): kept beside the commands folder, not in it
while read -r file to; do
  [ -z "$file" ] && continue
  mkdir -p "$(dirname "${CLAUDE_HOME:-$HOME/.claude}/$to")"
  curl -fsSL "$BASE/$file" -o "${CLAUDE_HOME:-$HOME/.claude}/$to"
done <<< "$EXTRAS"

echo ""
echo "Done. Open Claude Code in any project and type /glowup"
