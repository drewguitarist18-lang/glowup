#!/bin/bash
# Glowup installer for macOS. Double-click it: it puts /glowup into your Claude Code commands folder.
# Downloads features/glowup.md (the only stable feature) into ~/.claude/commands, and the scanner it runs into ~/.claude/glowup.
DEST="${CLAUDE_HOME:-$HOME/.claude}/commands"
URL="https://raw.githubusercontent.com/drewguitarist18-lang/glowup/main/features/glowup.md"
echo "Installing Glowup..."
echo
mkdir -p "$DEST"
SCAN="${CLAUDE_HOME:-$HOME/.claude}/glowup"
mkdir -p "$SCAN"
if curl -fsSL "$URL" -o "$DEST/glowup.md" && curl -fsSL "${URL%glowup.md}glowup-scan.mjs" -o "$SCAN/glowup-scan.mjs"; then
  echo "Installed /glowup -> $DEST/glowup.md"
  echo
  echo "Done. Restart Claude Code, open any project and type /glowup"
else
  echo "Something went wrong. Check your internet connection and try again."
fi
echo
read -n 1 -s -r -p "Press any key to close"
