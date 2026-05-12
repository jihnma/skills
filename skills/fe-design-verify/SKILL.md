---
name: fe-design-verify
description: Compare a React component's Storybook rendering against its Figma source via VRT (pixel diff + qualitative diff-image read). Standalone — does not modify code. Input is auto-detected as Figma URL/node-id or a component file path. Use when the user asks "does this match the design?" or "verify Button.tsx".
license: MIT
---

# fe-design-verify

VRT check. One Storybook story vs. **one specific Figma node**. Reports diff ratio and a qualitative read of the diff image. Does not modify code.

The heavy lifting (Figma fetch + flatten, custom-viewport screenshot, pixelmatch) is in the bundled `vrt.mjs` helper. This SKILL.md orchestrates around it.

## Scope: 1:1 Figma ↔ story mapping is required

VRT is a "design ↔ implementation matches" check. Without a corresponding Figma node, there is no ground truth to compare against — a failing diff cannot be distinguished from an intentional difference. **This skill only verifies stories that declare a 1:1 mapping** to a specific Figma node:

- Variant story (e.g. `Default`, `WithIcon`, `Primary`) → maps to one Figma **variant node** within a `COMPONENT_SET`.
- Matrix / overview story → maps to the parent `COMPONENT_SET` node (only if the rendered layout actually matches Figma's set-canvas; otherwise skip).
- Story without `parameters.design.url` (or matching `.figma.tsx`) → **out of scope** for VRT. Examples: edge-case stories for long text wrapping, loading / disabled states, a11y focus, responsive breakpoints. These belong in Storybook interaction / a11y / snapshot tests, not in this pipeline.

If a story should never be VRT-tested (deliberately), opt out with `parameters.figmaVrt: false` (recognised by this skill's discovery step).

## When to use

- "Verify this matches the Figma design" / "디자인이랑 맞는지 확인해줘"
- "I edited Button.tsx — is it still aligned with the design?"
- Called internally by `fe-design-implement` as its auto-verify step.

## Inputs

One of (auto-detected):

- **Figma URL or node ID** — `https://www.figma.com/design/<fileId>/...?node-id=123-456` or `123:456`.
- **Component file path (+ optional variant)** — `src/ui/Button.tsx` (defaults to its first story) or `src/ui/Button.tsx --variant=primary`.

Detection: contains `figma.com/` or matches `^\d+[-:]\d+$` → Figma input; otherwise a file path.

## Workflow

### 0. Precheck

- `FIGMA_ACCESS_TOKEN` (or value at `figma.config.json#tokenEnv`) set.
- `figma.config.json` reachable from cwd.
- Storybook reachable at `http://localhost:<port>/iframe.html`. Port from `figma.config.json#storybookPort`, default `6006`. **Stop with `Run pnpm storybook and re-invoke.` if not — never auto-start.**
- **Storybook setup** — all three needed, or diffs will be dominated by setup noise:
  - `.storybook/preview-head.html` contains `<style>body { margin: 0; }</style>` (otherwise 8px body margin = 16px offset at DSF=2).
  - `.storybook/preview.ts` sets `parameters.layout: 'fullscreen'` as the default (otherwise Storybook adds its own padding around the story).
  - **Font matching**: `preview-head.html` includes a `<link>` (or `@font-face`) for the Figma design's font family. Without it, Chromium falls back to system fonts, and text-glyph diff alone can exceed 5% on a small button. For Inter projects use the rsms.me build (the same one Figma renders with) — `<link rel="stylesheet" href="https://rsms.me/inter/inter.css">`. Google Fonts Inter is a different build with slightly different metrics and will leave residual text-glyph noise even after `document.fonts.ready`.
- **Dev deps in the cwd-anchored project**: `sharp`, `playwright`, `pixelmatch`, `pngjs`. vrt.mjs resolves these from `process.cwd()/node_modules`, so install them in the project being verified, not in the skill directory. Setup:
  ```sh
  pnpm add -D sharp playwright pixelmatch pngjs
  pnpm approve-builds   # pnpm 11: approve sharp's native build step
  npx playwright install chromium
  ```

### 1. Resolve the pair (Figma node ↔ Storybook story)

**Figma input:**
1. Parse `fileId` and `nodeId` from the URL (or use the ID directly). Normalize URL form `123-456` to API form `123:456`.
2. Find the React component:
   - If the project uses standalone `*.figma.tsx`: glob `**/*.figma.tsx` (scope by `figma.config.json#mappingScope`) for `figma.connect(...)` URLs containing `node-id=<nodeId>`.
   - If the project uses inline `parameters.design.url` inside `*.stories.tsx`: glob `**/*.stories.tsx` instead and match against that URL.
3. Read the adjacent `.stories.tsx`; derive `storyId` = lowercase + hyphenate the title, then append `--<variant>` for the first or specified variant.

**File-path input:**
1. Read the adjacent `.figma.tsx`, or read `parameters.design.url` in the adjacent `.stories.tsx`. Extract Figma URL → `fileId` + `nodeId`. If none: stop with `No Code Connect mapping found.`
2. Read the adjacent `.stories.tsx`; derive `storyId` as above.

**Required: 1:1 mapping check.** Before continuing, verify the story being tested has a Figma counterpart:

- The `.stories.tsx` declares `parameters.design.url` (or there is an adjacent `.figma.tsx`).
- `parameters.figmaVrt` is not `false`.

If either check fails, **exit** with: `Story <id> has no Figma mapping; VRT is not applicable. Use Storybook interaction or snapshot tests instead.` Do not fall back to a "closest variant" comparison — a false-positive fail without a reliable ground truth wastes more time than it saves.

**Variant matching:** each variant story corresponds to a specific Figma variant, not the parent `COMPONENT_SET`. If `parameters.design.url` points to the set (e.g. `node-id=6-38`), resolve to the variant node whose `componentProperties` match the story's `args` (e.g. for `args: { icon: '★' }`, pick the variant with `Show Icon = true`). Fetch `GET /v1/files/<fileId>/nodes?ids=<setId>` and walk the children to find the right variant. If the mapping is genuinely ambiguous (no `args` distinguish it), ask the user.

The exception: matrix / overview stories that intentionally compare against the whole `COMPONENT_SET`. In that case the URL pointing at the set is correct — but only if the rendered grid matches the set-canvas layout. Otherwise treat as out of scope.

**Viewport:** fetch the resolved variant node's `absoluteBoundingBox.{width, height}` and pass them as `--viewport=WxH` (integers; vrt.mjs rounds, but Figma bboxes are usually integer anyway). DO NOT use the matrix story's dimensions — match the single variant being verified.

### 2. Run the VRT helper

```sh
node ~/.claude/skills/fe-design-verify/vrt.mjs \
  --figma-file=<fileId> \
  --figma-node=<variantNodeId> \
  --story-url="http://localhost:<port>/iframe.html?id=<storyId>&viewMode=story" \
  --viewport=<W>x<H> \
  --ratio-threshold=<figma.config.json#vrtThreshold or 0.05>
```

`<W>x<H>` = the Figma variant's `absoluteBoundingBox` in CSS pixels (not ×2). The helper enforces `scale=2` (Figma) ↔ `deviceScaleFactor=2` (playwright) internally and resolves devDeps from cwd.

Helper writes `figma.png`, `code.png`, `diff.png` under `.fe-design-cache/diff/` (or `--output`) and prints JSON to stdout:

```json
{
  "verdict": "pass",
  "ratio": 0.0345,
  "ratioThreshold": 0.05,
  "mismatched": 244,
  "total": 7056,
  "dimensions": { "width": 126, "height": 56 },
  "files": { "figma": "...", "code": "...", "diff": "..." }
}
```

Exit codes: `0` pass, `1` fail (ratio ≥ threshold), `2` setup error.

### 3. Read the diff image (multimodal)

**Always read `diff.png`, even on PASS.** The ratio alone misleads.

Pattern heuristics:

| Diff pattern | Likely cause | Action |
|---|---|---|
| Thin red rim 1–2px on glyph outlines only | Antialiasing noise | Ignore — accept |
| Same text appears twice (ghost copy) | Horizontal / vertical translation — position or padding mismatch | Identify the offset axis from the diff first, then compare `padding-block`/`padding-inline` and margins against Figma's spacing; structural |
| Solid vertical or horizontal band on right or bottom edge | Width or height difference — often HUG vs pinned width | Check `primaryAxisSizingMode`; for ambiguous bands, `--debug-selectors` to compare DOM bbox to Figma `absoluteBoundingBox`; structural |
| Rounded outline misaligned | `border-radius` or box-model semantics mismatch | Compare MCP `rounded-N` to code; structural |
| Scattered red across a uniform color region | Color mismatch — token resolution gone wrong | Check Figma Variables → CSS variable binding |
| Large red mass over text glyphs | Wrong font build (e.g. Google Fonts Inter vs Figma's rsms.me Inter Variable) | Swap to Figma's font build in preview-head.html |
| Glyphs themselves shifted ~1px while outline aligns | Font hinting / sub-pixel rendering | Accept if shape matches; fail if cumulative |

Anything labeled "structural" overrides the ratio: **fail even when ratio < threshold**.

Threshold is a floor, not a ceiling. **VRT pass is necessary, not sufficient** — pixels can match while the box-model is semantically wrong (see ADR-0007). If `fe-design-implement` generated the code, the MCP-literal CSS rule already guards against this; for code written by hand, inspect `getComputedStyle` against Figma's `paddingTop/Bottom`, `cornerRadius`, `itemSpacing`, `strokeWeight` when in doubt.

**When the diff cause is ambiguous**, re-run vrt.mjs with `--debug-selectors='<csv>'` to dump `getBoundingClientRect` + computed `width / height / padding / margin / border / box-sizing` for the listed elements. Use this in place of an external DOM-inspection step:

```sh
node ~/.claude/skills/fe-design-verify/vrt.mjs ... \
  --debug-selectors='.sidebar,.dashboard__main-content,.button.button--md'
```

The output JSON gains a `debug` object keyed by selector. Past PoC examples: catching `sidebar` rendering 272px instead of 240px (missing `box-sizing: border-box`), or a `button` rendering 89px instead of HUG-expected ~62px (stale `min-width`).

### 4. Report

- Numeric ratio + percentage (e.g. `0.0345 (3.45%)`).
- One-paragraph qualitative description ("Glyph rendering on the 'Button' label only" / "Icon is shifted ~6px right of the design's position").
- Pass / Fail verdict.
- Paths to `figma.png`, `code.png`, `diff.png` for inspection.
- On fail, one short suggestion the user can refine in conversation.

## Threshold guidance (empirical, from PoC)

| Story size | Baseline noise | Recommended `vrtThreshold` |
|---|---|---|
| Small component (≤10k px, e.g. single button at DSF=2 = 126×56) | 5–8% from text-glyph rendering alone | **`0.05` (default)** |
| Variant (10k–100k px) | 2–4% | `0.02`–`0.03` |
| Matrix / page (>100k px) | 1–2% | `0.015` |

If text-glyph noise dominates and you can't load the design font, the per-component baseline rises. Run once against the unchanged component first to calibrate.

## Known limits

- **Sub-1pp changes** (e.g. a 4px padding shift on a small region of a large matrix) fall below any practical global ratio cut. The multimodal diff-image read in step 3 catches most. For pixel precision, narrow the story so the change occupies a larger fraction of the canvas.
- **Font mismatch** is the single biggest source of false positives on small components. Always load the Figma design font in `preview-head.html` before tightening thresholds.
- **Sub-pixel Figma bboxes** (e.g. 27.5×55.5) become integer viewports → ~1px shift. If the design uses fractional dimensions deliberately, accept the noise floor.

## Rules

- **Always read `diff.png`.** Ratio alone is insufficient.
- **Threshold is a floor, not a ceiling.** Under-threshold + structural diff = fail.
- **Storybook must already be running.** No automatic startup.
- **Viewport must equal the resolved variant's Figma bbox.** Not the matrix, not the parent set.
- **Stateless.** No session, no lock, no diff history. Cache under `.fe-design-cache/` only skips redundant work within a run.

## Failure paths

| Reason | Action |
|---|---|
| Storybook unreachable | Print `pnpm storybook` and exit. |
| Mapping missing (Figma input has no matching `.figma.tsx` or `.stories.tsx`) | Tell the user to add a Code Connect mapping or `parameters.design`. Exit. |
| Story has no `parameters.design.url` (and no `.figma.tsx`) | Exit with "VRT not applicable; out of scope." Do not compare against a similar variant. |
| Story has `parameters.figmaVrt: false` | Skip silently and report "opted out of VRT". |
| `.stories.tsx` missing (path input) | Print "create a story file" and exit. |
| Wrong variant resolved (mismatch obvious in diff) | Re-fetch the right variant node id; re-run. |
| Helper exit 2 (setup) | Show stderr; common causes: missing devDeps, missing token, sharp build not approved. |
| Helper exit 1 (vrt fail) | Report fail; user iterates in conversation and re-runs verify. |
| Dim mismatch | Helper's error includes both sizes — usually wrong `--viewport` or a sub-pixel Figma bbox. |
