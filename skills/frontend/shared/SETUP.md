# Setup

Shared prerequisites for the `fe-design-*` skills. Both `fe-design-code` and `fe-design-diff` link here from their precheck steps.

## Storybook preview config

All three required, or VRT diffs will be dominated by setup noise:

- **Body margin reset** — `.storybook/preview-head.html` contains `<style>body { margin: 0; }</style>`. Otherwise the 8px default body margin produces a 16px offset at `deviceScaleFactor=2`.
- **Fullscreen layout default** — `.storybook/preview.ts` sets `parameters.layout: 'fullscreen'` as the default. Otherwise Storybook adds its own padding around the story.
- **Font matching** — `preview-head.html` includes a `<link>` (or `@font-face`) for the Figma design's font family. Without it, Chromium falls back to system fonts and text-glyph diff alone can exceed 5% on a small button. For Inter projects use the rsms.me build — the same one Figma renders with:
  ```html
  <link rel="stylesheet" href="https://rsms.me/inter/inter.css">
  ```
  Google Fonts Inter is a different build with slightly different metrics and will leave residual text-glyph noise even after `document.fonts.ready`.

## Dev dependencies

`vrt.mjs` resolves these from `process.cwd()/node_modules`, so install them in the project being verified — not in the skill directory:

```sh
pnpm add -D sharp playwright pixelmatch pngjs
pnpm approve-builds   # pnpm 11: approve sharp's native build step
npx playwright install chromium
```
