# Storybook is a hard prerequisite for fe-design-diff

VRT needs a rendered React component to screenshot. We considered Storybook, Playwright Component Testing, an ad-hoc dev-server route, and skill-generated HTML files. We require Storybook running locally: it is the standard component-library entry point, AI already knows its URL conventions (`http://localhost:6006/iframe.html?id=<storyId>`), and `figmaCategoryPath` maps cleanly to Storybook story titles so `fe-design-diff` can locate the rendered component without extra configuration.

## Consequences

- Projects without Storybook can use `fe-design-code` but not `fe-design-diff`. The skill detects this at its precheck step and exits with an instruction to start Storybook.
- `fe-design-code` emits a `.stories.tsx` alongside the `.tsx` so `fe-design-diff` can run immediately after generation.
- The Storybook URL / story-ID convention is load-bearing — changes to how story IDs are derived (or to Storybook's URL scheme) ripple through `fe-design-diff`'s lookup logic.
- Trade-off: lock-in to one render context. Adding Playwright CT or a custom render path later would require a parallel diff path, not a swap.
