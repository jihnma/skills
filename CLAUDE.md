# Skill-writing conventions

How to write `SKILL.md` files in this repo. Applies to every skill under `skills/`.

## Audience

SKILL.md body is **for the model only**. Rationale ("why") lives in git history and ADRs (`skills/*/adr/`), not in the body. Human-facing prose belongs in `README.md` or `CONTEXT.md`. The frontmatter `description` is the trigger contract — keep it generous; extra words there are cheaper than a missed invocation.

## Rules

1. **Frontmatter `description` is the only trigger.** No `## When to use` section. No top-level summary paragraph that re-states the description.
2. **Body = decision rules, not explanation.** Each line is either an imperative ("do X when Y") or a literal the rule references (regex, file path, prop shape). Cut "why" / "this means" / "so that" clauses — those belong in commits or ADRs.
3. **Signal density over total length.** Don't say the same thing in two places. If a rule fits inside a workflow step, put it in that step. The `## Rules` section is reserved for *workflow-crossing* invariants only.
4. **Anti-patterns are signal. Positive examples are noise** when the rule + the model's default behavior already imply the right output. Keep `(height: 40px hides design intent)` — it corrects a model default. Cut `(padding: 10px 16px → py-10 px-16)` — re-derivable from the rule.
5. **Referenced shared docs: 1 inline boundary condition + link.** Don't paraphrase a shared doc *and* link to it. The inline line states the boundary (what this skill's outputs are, which identifiers cross the shell boundary, etc.); canonical text lives in shared. Security is the canonical case — miss-cost is highest there (prompt-injection vs. minor diff) — but the same rule applies to all `shared/*.md` and sub-doc links.
6. **Reference data stays inline** if the model consults it mid-execution (lookup tables, threshold guidance, diff-pattern catalogs). Decision rules win line space over architectural narrative.
7. **ADR refs are append-only.** When the body cites an ADR by number, never renumber that ADR. The body can't see the docs/ tree at parse time; renumbering silently breaks the rationale link.

## Cut checklist

For each line, ask:

- Is the same rule already encoded in a nearby workflow step? → cut.
- Is it a *why* clause with an ADR or commit reference nearby? → cut, keep the ref.
- Is it a positive example re-derivable from the rule? → cut.
- Is it `## When to use` or a top-summary that repeats the frontmatter? → cut.
- Is it paraphrasing `shared/SECURITY.md` content that is also linked? → cut the paraphrase, keep the link.

If none of those apply, keep it.

## Failure modes this framework is calibrated against

- **(A) Trigger failure**: skill doesn't fire when it should. Fixed by frontmatter `description`, not body length.
- **(B) Body-ignored failure**: skill fires but model doesn't follow its rules. Fixed by raising signal/noise ratio in the body, not by raw shortening.
