# Code Connect Lookup

Before writing any markup for a Figma node, every `INSTANCE` child must be checked against existing Code Connect mappings. Mapped components are reused, not reinvented.

This rule is non-negotiable. Skipping it produces markup that may look right but drifts visually because the wrong primitives are used — a problem no amount of styling can repair.

## Procedure

For the target Figma node and each of its descendants:

1. Identify every child whose Figma node `type` is `INSTANCE`.
2. Capture its `componentId`. If the instance is a variant of a component set, also capture `componentSetId`.
3. Find the existing React component for that Figma component. Two mapping conventions, both supported (see CONTEXT.md for terminology):
   - **sibling-file** — glob `**/*.figma.tsx` whose `figma.connect(...)` first argument (URL) contains `node-id=<componentId>` or `node-id=<componentSetId>`.
   - **in-story** — glob `**/*.stories.tsx` whose `parameters.design.url` contains the same `node-id=...`.
4. Record per instance:
   - **Hit** → the mapping file path and the imported React component. Derive prop values from the instance's `componentProperties` overrides (e.g. variant `"outline"`, size `"md"`).
   - **Miss** → record `mappedReactComponent: null`. Inventing markup for this subtree is allowed *only* if no mapping is found.

In a monorepo, search scope is determined by `figma.config.json#mappingScope`:

- `"monorepo"` (default for monorepos) — walk every workspace package.
- `"package"` — current package only.

## Action

- **Hit** — implementation **must** use the mapped React component. Do not fall back to a `<button>`, `<div>`, or hand-rolled markup. Pass props derived from `componentProperties`.
- **Miss** — invent markup as needed, and ask the user whether to add a new Code Connect mapping (separate task, not done in the same flow).

## When to perform the lookup

`fe-design-implement` performs the lookup as step 2 of its workflow, before any markup is written. The result lives in memory for the duration of the call — there is no persistence across invocations.

## Why

A wrong primitive choice cannot be repaired by styling. If a Figma `Button` instance is implemented as a hand-rolled `<button>`, the rendered result drifts in spacing, focus, hover, accessibility, and future `<Button>` refactors will skip this call site. Code Connect lookup is the single most load-bearing step in producing a faithful implementation.

## Rules

- **Lookup before write.** Never emit JSX for a target until every `INSTANCE` child has been resolved.
- **Mapping wins over markup.** If a mapping exists, no styling argument justifies inventing markup.
- **Set ids matter.** A component set has both a set id and per-variant ids; mappings may target either. Search both.
