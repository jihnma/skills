# Idempotency

Re-running the wrapper on the same issue updates the same PR in place. Detection is correctness-first (linked issues), with a search fallback.

## Detect existing PR

GraphQL `closingIssuesReferences` — authoritative for GitHub-side linkage:

```sh
gh api graphql -F owner=<O> -F repo=<R> -F number=<N> -f query='
  query($owner:String!,$repo:String!,$number:Int!) {
    repository(owner:$owner,name:$repo) {
      issue(number:$number) {
        closedByPullRequestsReferences(first:5, states:OPEN) {
          nodes { number url headRefName }
        }
      }
    }
  }'
```

- 0 nodes → create new PR.
- 1 open node → update in place.
- ≥2 → surface at gate; user picks.

For JIRA-sourced issues, search the repo for PRs whose body contains the JIRA key (`gh pr list --state open --search "<KEY> in:body"`). JIRA→PR linkage is best-effort.

## Update in place

- Same branch, append new commits (one per re-run, one component per commit).
- PR body **overwritten** (not appended). Body is "current state of implementation", not a changelog.
- `refs/uploads/pulls/<N>` ref: **fast-forward** with a new commit whose parent is the current ref tip. Old PNGs stay reachable through history; PR body always embeds the latest sha. No force-push.
- VRT artifacts on disk (`.fe-design-cache/diff/<Component>/`) overwritten by each fe-design-create run.

## `--new-pr` escape hatch

Skip detection entirely, always create a new PR + branch. For the rare case the user wants to split work that was previously combined.

## Removed components

Component implemented in an earlier run but no longer listed in the issue → wrapper surfaces at the gate ("X exists in PR but no longer in issue"). Default: keep. User chooses explicitly to remove.
