# Emit publish-ready Code Connect by default; never auto-publish

Prior to this decision, `fe-design-code`'s emit defaults produced files that were not publishable without manual edits. **Sibling-file**: the skill wrote only the component + story; `<Component>.figma.tsx` was deferred as a follow-up task. **In-story**: `parameters.design` was placed only on individual stories — invisible to `figma connect publish`, which reads only `meta`-level (default export) `parameters.design` (see ADR-0009). The result, surfaced when chasing why an `fe-design-pr`-generated PR couldn't be published: the agent shipped code that would never reach Figma Dev Mode without follow-up surgery.

The new defaults make the generated code publish-ready end-to-end while keeping the skill out of the publish path itself:

- **Sibling-file emit** writes `<ComponentName>.figma.tsx` directly, with `figma.connect(<URL>, { props, examples })`. URL is the `COMPONENT_SET` (or single `COMPONENT`) URL. Story files keep per-variant `parameters.design.url` for VRT.
- **In-story emit** places `parameters.design` on the `meta` (default export) — full Code Connect mapping (URL + props + examples) — and additionally on each story (URL only, for VRT). The two layers don't conflict: meta drives publish + Dev Mode; per-story drives VRT.
- **fe-design-pr** appends a one-line publish hint to the PR body (`Run \`figma connect publish\` to push to Figma`). The skill never invokes publish.

The decision to stop short of auto-publish is deliberate. Publishing writes to a shared Figma library that everyone in the design system consumes. Doing it from the agent — pre-merge, before a human reviewer sees the mapping — risks zombie mappings if the PR is rejected, and broadens the auth surface (publish requires Figma write access; we currently use a read scope). The PR review boundary is the natural human gate; we keep it.

## Consequences

- One `fe-design-pr` call produces a publish-ready PR. The user (or their CI) runs `figma connect publish` to push.
- In-story files now carry two `parameters.design` placements; both are valid Storybook syntax and both render in Storybook UI. Documented in CONTEXT.md and `fe-design-code` SKILL.md step 4.2.
- Behavior change for existing `fe-design-code` users: sibling-file convention now writes `.figma.tsx`; in-story convention adds a meta-level mapping. Existing files without these placements are unaffected — the skill regenerates only on explicit invocation.
- The `figma connect publish` precheck warning (FIGMA-CONFIG.md `## Code Connect CLI compatibility`) becomes practically relevant: the user is now likely to run publish, so a missing `codeConnect` block surfaces sooner.
- Revisit if either: (a) Figma's Code Connect supports per-variant publish (would simplify in-story to one placement); or (b) a strong use case emerges for agent-driven publish (would still need a separate decision about auth + PR-review interaction).
