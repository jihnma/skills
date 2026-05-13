# Skills

Frontend engineering skills for AI agents.

[![skills.sh](https://skills.sh/b/jihnma/skills)](https://skills.sh/jihnma/skills)

## Skills

| Skill | What it does |
|---|---|
| [`fe-design-create`](./skills/fe-design-create/SKILL.md) | Turn a Figma component into React + Storybook code with an auto visual check. |
| [`fe-design-check`](./skills/fe-design-check/SKILL.md) | Compare an existing component against its Figma source to confirm they still match. |
| [`fe-design-pr`](./skills/fe-design-pr/SKILL.md) | Take a GitHub or JIRA issue with Figma links and open a PR with the generated components. |

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
