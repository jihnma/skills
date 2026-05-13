# Skills

Frontend engineering skills for AI agents.

[![skills.sh](https://skills.sh/b/jihnma/skills)](https://skills.sh/jihnma/skills)

## Skills

- [`fe-design-implement`](./skills/fe-design-implement/SKILL.md) — Turn one Figma component (or variant set) into a React component + Storybook story, then auto-verify visual match.
- [`fe-design-verify`](./skills/fe-design-verify/SKILL.md) — VRT check: compare an existing component's Storybook rendering against its Figma source. Standalone.
- [`fe-design-pr`](./skills/fe-design-pr/SKILL.md) — Wrap a GitHub or JIRA issue into a PR: parse Figma URLs from the issue, run `fe-design-implement` per component via subagent, then open (or update) the PR with VRT diff images embedded inline.

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
