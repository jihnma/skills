# Current implementation target is React

`fe-design-code` and `fe-design-check` assume a React + Storybook + TypeScript project. SKILL.md prose references `.tsx`, JSX-style markup, Storybook's React format, and Code Connect's React parser; the `vrt.mjs` helper is framework-agnostic (it compares two PNGs) and the architectural decisions in ADR-0001..0007 apply unchanged to other frameworks. Vue, Svelte, Solid, and others are deferred until there is concrete demand — at which point they will be introduced either as sibling skills (`fe-design-code-vue`, …) or via a framework-detection branch inside the existing skills, depending on how much prose actually has to fork.

## Consequences

- These skills are not invoked on Vue / Svelte projects today. The precheck surfaces a Code Connect parser mismatch when `figma.config.json#codeConnect.parser` is not `react`.
- Adopting another framework later is a deliberate, scoped extension — sibling skill or detection branch — not a quiet shoehorn into the existing prose.
- This decision is recorded explicitly so a future reader does not mistake React-flavoured prose for a hidden assumption; it is a stated, intentional current scope.
- `vrt.mjs` remains framework-agnostic by design (image-in / image-out), so adding a second framework only requires duplicating the SKILL.md prose, not the helper.
