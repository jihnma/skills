# Confirmation gate

One prompt batches every decision that could otherwise interrupt the loop. Skipped by `--yes` (which exits on ambiguity instead).

## Shape

```
📋 Issue #<N> "<title>"

Figma nodes (<valid>/<total>):
  ✅ <Path/Name>   (<TYPE>, node <id>)
  ⚠️ <Path/Name>   (<TYPE> — not a component; skip recommended)

Intent (from body + <N> comments):
  "<2-3 line LLM summary>"

Project state:
  • Code Connect: <in-story | sibling-file | mixed → choose | none>
  • Naming: <inferred from N existing components | green-field → ask>

Idempotency:
  <PR #<N> (open) — will update in place | no existing PR — will create new>

[Y]es / [n]o / [l]ist-only (pick a subset) / [e]dit (modify state answers)
```

For `list-only`, the user replies with a comma-separated list of component names (e.g. `Button, LoginForm`). Unrecognised names → re-prompt. Empty → cancel. The selection is intersected with the valid set (non-COMPONENT nodes excluded automatically).

## Resolution rules

| State | Default | `--yes` behaviour |
|---|---|---|
| Non-COMPONENT nodes | Skip (warn) | Skip |
| Mixed Code Connect | Ask | Exit with remediation (set `## Code Connect convention` in `CLAUDE.md`) |
| Green-field | Ask once; wrapper persists answer for subsequent components | Exit with remediation |
| Intent ↔ Figma contradiction (e.g. "secondary" in body, primary variant linked) | Surface, ask which is canonical | Exit |
| Existing PR found | Update in place | Update in place |
| Component listed before but missing in current issue | Surface, ask keep/remove | Keep (no auto-delete) |

## Why batch

Each fe-design-code call would otherwise stop on green-field / mixed-CC / FRAME-vs-COMPONENT. Pre-detecting once and answering once keeps the loop unattended; mid-loop prompts defeat the wrapper's purpose.
