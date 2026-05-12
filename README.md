# Skills

Frontend engineering skills for AI agents.

[![skills.sh](https://skills.sh/b/jihnma/skills)](https://skills.sh/jihnma/skills)

## Skills

- [`fe-design-implement`](./skills/fe-design-implement/SKILL.md) — Turn one Figma component (or variant set) into a React component + Storybook story, then auto-verify visual match.
- [`fe-design-verify`](./skills/fe-design-verify/SKILL.md) — VRT check: compare an existing component's Storybook rendering against its Figma source. Standalone.

Shared context, ADRs, and reference docs for the fe-design family live next to the skills, under [`skills/fe-design-shared/`](./skills/fe-design-shared/) (`CONTEXT.md`, `FIGMA-CONFIG.md`, `CODE-CONNECT-LOOKUP.md`, `adr/`). It is not a skill — `link-skills.sh` ignores it because it has no `SKILL.md`.

## Install

```sh
npx skills@latest add jihnma/skills
```

Works with Claude Code, Cursor, GitHub Copilot, Windsurf, OpenCode, and other agents.

## Development

Authors of this repo should symlink the skills into `~/.claude/skills/` so edits are live:

```sh
./scripts/link-skills.sh
```

End users install via `skills.sh`, which copies files — no symlink needed.

## License

MIT
