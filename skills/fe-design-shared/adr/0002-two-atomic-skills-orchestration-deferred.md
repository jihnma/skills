# Two atomic skills; orchestration deferred

The previous design had five fe-design-* skills plus a macro `fe-design-code` that bundled issue parsing → code generation → audit self-heal loop → PR creation. We ship only two atoms: `fe-design-code` (one Figma node → `.tsx` + `.stories.tsx` + auto-verify) and `fe-design-diff` (component vs. Figma, standalone). Higher-level flows (issue → PR, batch implementation across a Figma page, CI gating) stay as ad-hoc AI composition — when the same sequence repeats three or more times in real use, it gets promoted to a thin wrapper skill that *only* calls the two atoms.

## Consequences

- Each skill stays small, single-purpose, and easy to reason about.
- AI composes macro flows in conversation, which keeps them flexible at the cost of a single-keystroke entry point.
- Future wrapper skills must be pure orchestration — no business logic — so the atoms remain the source of truth.
- Self-heal of failed VRT happens through user-AI dialogue ("패딩이 다르네, 고쳐줘"), not through an automated loop. This shifts the iteration loop from skill code to the chat session.
- Trade-off: users who want "implement this issue → open PR" today must invoke multiple steps or ask the AI explicitly. A future `fe-design-from-issue` wrapper is anticipated but not built.
