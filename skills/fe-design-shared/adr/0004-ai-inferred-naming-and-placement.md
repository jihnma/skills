# AI infers component naming and file placement from the project's design system

The previous design used `figma.config.json` fields (`outputBase`, `mirrorFigmaStructure`) and a hardcoded convention (`src/<categoryPath>/<Name>.tsx`) to determine where generated files land and what they are called. Instead, `fe-design-implement` instructs AI to read the project's existing components and follow their naming and directory placement patterns — no config field controls this. Storybook story titles remain anchored to `figmaCategoryPath` so `fe-design-verify` can locate stories regardless of where files live on disk.

## Consequences

- `figma.config.json` no longer carries `outputBase` or `mirrorFigmaStructure` — these can be removed when the shared docs are next updated.
- For a green-field project with no existing components, AI asks the user once and the answer sets the precedent for subsequent calls within the same conversation.
- Component-name consistency depends on AI faithfully following the existing design-system pattern — not on a config-enforced rule. A linter or static check cannot validate placement.
- Trade-off: more flexibility at the cost of less determinism. Two AI invocations on the same project converge because the *existing* code anchors the pattern, not because a config locks it in. On a project with inconsistent existing placement, AI inherits that inconsistency.
