# VRT applies only to stories with a 1:1 Figma ↔ story mapping

VRT is by definition a "design ↔ implementation matches" check. Without a specific Figma node as ground truth, a diff is uninterpretable — a fail cannot be distinguished from an intentional difference, and comparing a story against a "similar" Figma variant produces guaranteed false positives. The PoC ran the `WithIcon` story (icon `★`) against the Figma variant for `Show Icon = false`, producing a 7.6% ratio that looked like a real defect but was actually a wrong pairing. We restrict VRT to stories that declare a Figma node via `parameters.design.url` (or an adjacent `.figma.tsx`), with the URL pointing at the specific variant the story represents (not the parent `COMPONENT_SET`). Stories without a Figma counterpart — long-text wrapping, loading / disabled state combinations, a11y focus, responsive breakpoints — are out of scope for VRT and belong to Storybook interaction, snapshot, or a11y tests.

## Consequences

- `verify-figma-match` exits with "out of scope" on stories that lack a Figma node mapping. It never falls back to comparing against a "closest" variant.
- `figma-to-react` generates one story per Figma variant and binds each story's `parameters.design.url` to that specific variant node id. The parent `COMPONENT_SET` URL is not reused across variants.
- An explicit opt-out flag `parameters.figmaVrt: false` lets users keep a story that intentionally has no Figma equivalent (e.g. an internal debug story) without tripping the precheck.
- Edge-case stories (long text wrapping, disabled state, etc.) are valuable but the skill does not auto-generate them. The user creates them separately and tests them with non-VRT tools.
- Trade-off: VRT coverage is strictly narrower than "everything in Storybook." Stories that drift from the design without a corresponding Figma update cannot be auto-flagged by this pipeline — but the alternative (lossy comparison against similar variants) is worse because it normalises false positives.
