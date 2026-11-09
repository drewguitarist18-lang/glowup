#!/bin/bash
# Glowup installer for macOS. Double-click it: it puts /glowup into your Claude Code commands folder.
# Downloads features/glowup.md (the only stable feature) straight into ~/.claude/commands.
DEST="${CLAUDE_HOME:-$HOME/.claude}/commands"
URL="https://raw.githubusercontent.com/drewguitarist18-lang/glowup/main/features/glowup.md"
echo "Installing Glowup..."
echo
mkdir -p "$DEST"
if curl -fsSL "$URL" -o "$DEST/glowup.md"; then
  echo "Installed /glowup -> $DEST/glowup.md"
  echo
  echo "Done. Restart Claude Code, open any project and type /glowup"
else
  echo "Something went wrong. Check your internet connection and try again."
fi
echo
read -n 1 -s -r -p "Press any key to close"
