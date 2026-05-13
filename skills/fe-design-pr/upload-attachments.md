# VRT attachment flow

VRT diff PNGs are embedded in the PR body by pushing them to a hidden `refs/uploads/pulls/<N>` ref via the Git Data API (no extension; pure `gh api`). Reviewers see images inline because they're authenticated to the repo in their browser; the PR branch stays free of binary artifacts.

## Order (matters)

1. **Open draft PR with placeholder body** — paths only, no image embeds. If anything fails downstream the PR is still validly readable.
2. **Push artifacts** — build a tree of PNGs, fast-forward `refs/uploads/pulls/<N>`. Captures the latest blob SHA.
3. **Rewrite PR body** with `https://github.com/<O>/<R>/blob/<SHA>/<Component>/<file>.png?raw=true` URLs via `gh pr edit --body-file`.

Reversing the order leaves the PR with broken image links if the ref push fails. The rewrite step is idempotent (overwrite-by-default), safe for re-runs.

## Helper

`upload-attachments.mjs` (this directory) — single entry point. **Run once per wrapper invocation, batched across all components in this run.**

### Exact invocation

```sh
node ${CLAUDE_PLUGIN_ROOT}/skills/fe-design-pr/upload-attachments.mjs \
  --owner <O> --repo <R> --pr <N> \
  --component <ComponentName>:<figma.png>,<code.png>,<diff.png> \
  [--component <Name2>:<f>,<c>,<d>] ...
```

**Format details (exact, no improvisation)**:
- `--component` value is `<Name>:<figma>,<code>,<diff>` — colon between name and files, comma between files. No spaces inside the value.
- `<Name>` is validated as `^[A-Za-z0-9_-]+$` by the helper (rejects path traversal / shell metacharacters / commas / colons in names).
- Required flags: `--owner`, `--repo`, `--pr`, and at least one `--component`. Missing any of these exits with code 2.
- File paths should be the **per-component paths** (e.g. `.fe-design-cache/diff/Button/diff.png`), not the raw `.fe-design-cache/diff/diff.png` that fe-design-implement writes. The wrapper moves files into per-component subdirs immediately after each subagent returns (see SKILL.md workflow step 5).

**Invocation hygiene.** When the wrapper calls this helper via the Bash tool, pass each `--component <Name>:<paths>` value as a single argv element — don't string-concatenate values into the command line. The same applies to `gh api` flags (`-F owner=<O>`); use `-F key=value` form so `gh` parses, not the shell.

### Output

JSON to stdout:

```json
{
  "commitSha": "<40-char SHA>",
  "ref": "refs/uploads/pulls/<N>",
  "components": {
    "Button":  { "figma": "<sha>", "code": "<sha>", "diff": "<sha>" },
    "LoginForm": { ... }
  },
  "embedUrlTemplate": "https://github.com/<O>/<R>/blob/<commitSha>/{component}/{file}.png?raw=true"
}
```

The wrapper uses `commitSha` + per-component names to template embed URLs into the PR body — no need to read the helper's source.

## Git Data API steps (what the helper does)

For each PNG:

```sh
jq -Rs '{content: ., encoding: "base64"}' < <(base64 < figma.png) \
  | gh api repos/<O>/<R>/git/blobs --input - -q .sha
```

Use `gh api --input -` (stdin) not `-f`/`-F` — long base64 strings with `=` and `+` corrupt under shell-escape.

Combine blobs into a tree (paths: `<Component>/figma.png`, `<Component>/code.png`, `<Component>/diff.png`):

```sh
gh api repos/<O>/<R>/git/trees --input - <<< "$tree_json"
```

Create a commit. The **parent** is the current tip of `refs/uploads/pulls/<N>` if the ref exists, otherwise none. Message: `vrt: PR #<N> @ <iso-ts>`.

Update the ref (create on first push, fast-forward thereafter):

```sh
# First push:
gh api repos/<O>/<R>/git/refs --method POST \
  --field ref="refs/uploads/pulls/<N>" --field sha=<commit-sha>

# Subsequent pushes (fast-forward only — force=false omitted = default):
gh api repos/<O>/<R>/git/refs/uploads/pulls/<N> --method PATCH \
  --field sha=<commit-sha>
```

Never pass `--field force=true`. If the PATCH fails because parent isn't tip, surface the error rather than overwrite — it means a concurrent run; user resolves manually.

## Embed URL

`https://github.com/<owner>/<repo>/blob/<commit-sha>/<Component>/diff.png?raw=true`

Renders inline for browser-authenticated viewers. Does **not** render in third-party clients (Slack unfurl, email preview, Camo cache); accepted trade-off — review happens in GitHub UI.

## Durability note

`refs/uploads/*` is community convention, not documented as SLA'd. See the spike test in `/scripts/spike-refs-uploads.sh` at the repo root — if it ever shows GC, fall back to `refs/heads/attachments/pr-<N>`.
