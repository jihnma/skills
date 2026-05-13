#!/usr/bin/env bash
set -euo pipefail

# Link every skill and agent in this repository into ~/.claude so Claude Code
# can load them. Safe to re-run after pulling changes.
#
# End users install via skills.sh (file copy). This script is for developers
# of this repo who need live-editing of SKILL.md, agents, and bundled helpers.
#
# Pattern adapted from https://github.com/mattpocock/skills/blob/main/scripts/link-skills.sh

REPO="$(cd "$(dirname "$0")/.." && pwd)"
SKILLS_DEST="$HOME/.claude/skills"
AGENTS_DEST="$HOME/.claude/agents"

# Bail out if either DEST is a symlink into this repo — otherwise we'd write
# per-item symlinks back into our own working copy.
for dest in "$SKILLS_DEST" "$AGENTS_DEST"; do
  if [ -L "$dest" ]; then
    resolved="$(readlink -f "$dest")"
    case "$resolved" in
      "$REPO"|"$REPO"/*)
        echo "error: $dest is a symlink into this repo ($resolved)." >&2
        echo "Remove it (rm \"$dest\") and re-run; this script will recreate it as a real directory." >&2
        exit 1
        ;;
    esac
  fi
done

mkdir -p "$SKILLS_DEST" "$AGENTS_DEST"

# Skills: link each skill directory.
find "$REPO/skills" -name SKILL.md -not -path '*/node_modules/*' -not -path '*/deprecated/*' -print0 |
while IFS= read -r -d '' skill_md; do
  src="$(dirname "$skill_md")"
  name="$(basename "$src")"
  target="$SKILLS_DEST/$name"

  if [ -e "$target" ] && [ ! -L "$target" ]; then
    rm -rf "$target"
  fi
  ln -sfn "$src" "$target"
  echo "linked skill   $name -> $src"
done

# Agents: link each .md file individually.
if [ -d "$REPO/agents" ]; then
  find "$REPO/agents" -maxdepth 1 -name '*.md' -print0 |
  while IFS= read -r -d '' agent_md; do
    name="$(basename "$agent_md")"
    target="$AGENTS_DEST/$name"

    if [ -e "$target" ] && [ ! -L "$target" ]; then
      rm -f "$target"
    fi
    ln -sfn "$agent_md" "$target"
    echo "linked agent   $name -> $agent_md"
  done
fi
