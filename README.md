# Skills

Frontend engineering skills for AI agents.

[![skills.sh](https://skills.sh/b/jihnma/skills)](https://skills.sh/jihnma/skills)

## Skills

- `fe-design-implement` — Turn one Figma component (or variant set) into a React component + Storybook story, then auto-verify visual match against the design.
- `fe-design-verify` — VRT check: compare an existing component's Storybook rendering against its Figma source. Standalone, does not modify code.

## Install

```sh
npx skills@latest add jihnma/skills
```

Works with Claude Code, Cursor, GitHub Copilot, Windsurf, OpenCode, and other agents.

## Requirements (user project)

- `figma.config.json` with `fileId` (single-package) or a `files` alias map (monorepo). See [docs/shared/FIGMA-CONFIG.md](./docs/shared/FIGMA-CONFIG.md).
- Figma access token in `FIGMA_ACCESS_TOKEN` env var.
- Code Connect — uses either standalone `*.figma.tsx` files or inline `parameters.design.url` in `*.stories.tsx`.
- Storybook (required for `fe-design-verify`):
  - `<style>body { margin: 0; }</style>` in `.storybook/preview-head.html`
  - `parameters.layout: 'fullscreen'` as the default in `.storybook/preview.ts`
  - `<link>` (or `@font-face`) for the design's font family in `preview-head.html` — otherwise text-glyph noise dominates VRT diffs
- VRT dev deps:
  ```sh
  pnpm add -D sharp playwright pixelmatch pngjs
  pnpm approve-builds   # pnpm 11: approve sharp's native build
  npx playwright install chromium
  ```

## Development

End users install via `skills.sh` (file copy). Authors of this repo should symlink the skills instead, so edits in `skills/` are live:

```sh
./scripts/link-skills.sh
```

Safe to re-run after pulling changes. Symlinks land at `~/.claude/skills/fe-design-*`.

## Architecture

- [`CONTEXT.md`](./CONTEXT.md) — domain language and load-bearing terms.
- [`docs/adr/`](./docs/adr/) — architectural decisions:
  1. No published package; compose existing CLIs.
  2. Two atomic skills; orchestration deferred.
  3. Storybook required for verify.
  4. AI-inferred component naming and file placement.
  5. Bundled VRT helper script supplements compose-CLIs.
  6. VRT requires a 1:1 Figma ↔ story mapping.
  7. MCP `get_design_context` output is normative for CSS structure.
- [`skills/fe-design-implement/SKILL.md`](./skills/fe-design-implement/SKILL.md) — the implement skill.
- [`skills/fe-design-verify/`](./skills/fe-design-verify/) — verify skill and the bundled [`vrt.mjs`](./skills/fe-design-verify/vrt.mjs) helper.

## License

MIT
