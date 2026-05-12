#!/usr/bin/env bash
set -euo pipefail

# Link every skill in this repository into ~/.claude/skills so Claude Code
# can load it. Safe to re-run after pulling changes.
#
# End users install via skills.sh (file copy). This script is for developers
# of this repo who need live-editing of SKILL.md and bundled helpers.
#
# Pattern adapted from https://github.com/mattpocock/skills/blob/main/scripts/link-skills.sh

REPO="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$HOME/.claude/skills"

# Bail out if DEST itself is a symlink into this repo — otherwise we'd write
# per-skill symlinks back into our own working copy.
if [ -L "$DEST" ]; then
  resolved="$(readlink -f "$DEST")"
  case "$resolved" in
    "$REPO"|"$REPO"/*)
      echo "error: $DEST is a symlink into this repo ($resolved)." >&2
      echo "Remove it (rm \"$DEST\") and re-run; this script will recreate it as a real directory." >&2
      exit 1
      ;;
  esac
fi

mkdir -p "$DEST"

find "$REPO/skills" -name SKILL.md -not -path '*/node_modules/*' -not -path '*/deprecated/*' -print0 |
while IFS= read -r -d '' skill_md; do
  src="$(dirname "$skill_md")"
  name="$(basename "$src")"
  target="$DEST/$name"

  if [ -e "$target" ] && [ ! -L "$target" ]; then
    rm -rf "$target"
  fi
  ln -sfn "$src" "$target"
  echo "linked $name -> $src"
done
