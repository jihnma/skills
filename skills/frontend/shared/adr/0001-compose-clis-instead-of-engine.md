# Compose existing CLIs instead of building a comparison engine

The previous design shipped `fe-design-audit-core` as a custom npm package that did token, structure, and VRT checks. With Figma MCP + Code Connect mature enough for AI to handle the non-pixel checks via tool use, the only deterministic work left is pixel diffing — and `pixelmatch` already ships that as a standalone CLI. Skills now invoke `npx pixelmatch`, `npx playwright screenshot`, and Figma MCP/REST directly; we publish no package of our own.

## Consequences

- Skills are markdown only — no engine to build, version, or publish.
- Distribution is just skill files (clone, symlink, or a future `skills.sh`-style installer).
- CI runs the same `npx` commands without needing AI.
- Trade-off: there is no shared engine binding local and CI to identical behaviour — both rely on the same CLI versions being installed. If `pixelmatch` or `playwright` change semantics across versions, both environments must update in lock-step.
