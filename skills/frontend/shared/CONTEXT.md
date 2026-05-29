# Context

The frontend skills generate React components from Figma designs and verify the result matches visually. This file defines load-bearing terms specific to that workflow.

## Language

**Code Connect**:
Figma's mapping mechanism between Figma components and React components, declared via `figma.connect(...)`. Lookup is non-negotiable before writing markup. See [CODE-CONNECT-LOOKUP](./CODE-CONNECT-LOOKUP.md).
_Avoid_: figma binding, figma mapping

**sibling-file** / **in-story** (Code Connect conventions):
Two places a Code Connect mapping can live. **sibling-file**: a separate `<Component>.figma.tsx` next to the component. **in-story**: `parameters.design` inside the component's `.stories.tsx` (the Storybook-native path; also carries `props` + `examples` from `@figma/code-connect`).
The two are equivalent for **lookup** (the skill greps both for a matching `node-id=...`) and for **VRT** (the URL drives a per-story Figma export). They differ for **publishing**: `figma connect publish` reads `.figma.tsx` files, and only reads `.stories.tsx` when `parameters.design` lives on the `meta` (default export). Per-story `parameters.design` is invisible to publish — it's a Storybook display link only. The skill emits both placements (meta-level for publish, per-story for VRT) but does not run publish itself — that's the user's CI step. See ADR-0009 and ADR-0010.
A project picks one convention and sticks with it; mixing is detected and resolved per-project in `CLAUDE.md`.
_Avoid_: Standalone mapping, Inline mapping (older names — superseded)

**VRT**:
Visual regression testing. Pixel-level comparison between a Figma node export and a Storybook screenshot of the corresponding React component, producing a diff ratio + diff image. **Applies only to stories with a 1:1 Figma node mapping** (`parameters.design.url` or a `.figma.tsx`). Stories without a Figma counterpart (edge cases, loading states, a11y) are out of scope — they belong to Storybook interaction/snapshot/a11y tests. **Necessary but not sufficient** for design fidelity — pixels can match while the box-model is semantically wrong (e.g. `height` substituted for `padding-block`). Structural fidelity is enforced upstream by treating MCP `get_design_context` output as normative (see ADR-0007), not by VRT itself. Threshold lives in `figma.config.json#vrtThreshold`; calibration by story size is in `verify-figma-match` SKILL.md `## Threshold guidance`. Executed via the bundled `vrt.mjs` helper at `skills/verify-figma-match/vrt.mjs`, which wraps `sharp` (flatten transparent Figma PNG on white), `playwright` (custom viewport + `deviceScaleFactor=2` to match Figma `scale=2`), and `pixelmatch` (`threshold: 0.1`, `includeAA: false`) into a single CLI call.
_Avoid_: visual diff, screenshot diff, visual check

**reuse table**:
Per-target lookup result mapping each Figma `INSTANCE` child to either a known React component (via Code Connect) or null. Built fresh by `figma-to-react` before generating markup; not persisted.
_Avoid_: mapping table, instance map

**figmaCategoryPath**:
Ordered path from Figma's page-level CANVAS down to a target node, with the page name dropped. Drives the **Storybook story title** so verify-figma-match can locate the rendered component. Does **not** drive file system layout — that is inferred by AI from the project's existing component placement conventions.
_Avoid_: figma path, node path

## Skills

**figma-to-react**:
Skill that converts a Figma node into a React component (`.tsx`) plus its companion Storybook story (`.stories.tsx`). Auto-runs VRT at the end and reports the diff ratio. No self-heal loop — if VRT fails, the user iterates via conversation. **Component name and file placement are inferred from the project's existing design system**: AI reads how current components are named and located, then follows the same pattern. If no existing pattern is found, AI asks the user once.

**verify-figma-match**:
Skill that compares an existing component's Storybook rendering against its Figma source via VRT. Standalone — does not modify code. Requires Storybook to be running locally.

## Relationships

- An **figma-to-react** call produces one `.tsx` + one `.stories.tsx`, then triggers **VRT**.
- **VRT** depends on **Storybook** running locally with `body { margin: 0 }` in `.storybook/preview-head.html` and `parameters.layout: 'fullscreen'` as default, plus Figma REST `GET /v1/images?scale=2` for the design export. It is executed via the bundled helper: `node ~/.claude/skills/verify-figma-match/vrt.mjs --figma-file=... --figma-node=... --story-url=... --viewport=WxH`.
- Every Figma `INSTANCE` child in a target is resolved via **Code Connect** lookup before markup is written; results go into the **reuse table**.
- **figmaCategoryPath** maps a Figma node to its Storybook story title (and therefore story ID), so VRT can locate the rendered component without extra config. File system placement is inferred separately by AI from the project's existing patterns.

## Example dialogue

> **User:** "Implement the `Button/primary/large` variant from Figma."
> **AI:** "Walking the Figma node — it's a `Button` instance. Checking **Code Connect** — found a mapping in `src/ui/Button.figma.tsx`. The **reuse table** says: use the existing `<Button variant='primary' size='lg'>`, no new markup needed. Writing component + story. Running **VRT** via `vrt.mjs` — diff 0.0084 (0.84%), under threshold 0.015 (1.5%). Diff image shows antialiasing only on text edges. Done."

