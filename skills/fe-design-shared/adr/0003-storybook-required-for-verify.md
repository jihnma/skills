# Storybook is a hard prerequisite for verify

VRT needs a rendered React component to screenshot. We considered Storybook, Playwright Component Testing, an ad-hoc dev-server route, and skill-generated HTML files. We require Storybook running locally: it is the standard component-library entry point, AI already knows its URL conventions (`http://localhost:6006/iframe.html?id=<storyId>`), and `figmaCategoryPath` maps cleanly to Storybook story titles so verify can locate the rendered component without extra configuration.

## Consequences

- Projects without Storybook can use `fe-design-implement` but not `fe-design-verify`. The verify skill detects this at its precheck step and exits with an instruction to start Storybook.
- `fe-design-implement` emits a `.stories.tsx` alongside the `.tsx` so verify can run immediately after generation.
- The Storybook URL / story-ID convention is load-bearing — changes to how story IDs are derived (or to Storybook's URL scheme) ripple through verify's lookup logic.
- Trade-off: lock-in to one render context. Adding Playwright CT or a custom render path later would require a parallel verify path, not a swap.
