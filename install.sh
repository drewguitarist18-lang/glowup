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

# Each line of FEATURES is: <file> <command>, for stable features only.
FEATURES="$(curl -fsSL "$BASE/features.json" | node -e '
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

echo ""
echo "Done. Open Claude Code in any project and type /glowup"
