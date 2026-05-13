#!/usr/bin/env bash
# Spike test: verify that refs/uploads/<...> is durable on github.com.
# Pushes a synthetic ref to a target repo, then re-checks it after a delay.
#
# Run once today to set up, then again in a week with --verify to check survival.
#
# Usage:
#   ./scripts/spike-refs-uploads.sh setup   --repo <owner/name>
#   ./scripts/spike-refs-uploads.sh verify  --repo <owner/name>
#
# Requires: gh CLI authed with `contents: write` on the target repo.
# Recommendation: use a *throwaway* repo, not production.

set -euo pipefail

CMD="${1:-}"; shift || true
REPO=""
REF="refs/uploads/spike/durability-test"
TEST_PATH="spike/marker.txt"
STATE_FILE="$(cd "$(dirname "$0")/.." && pwd)/.spike-refs-uploads.json"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo) REPO="$2"; shift 2 ;;
    *) echo "unknown arg: $1" >&2; exit 2 ;;
  esac
done

[[ -z "$REPO" ]] && { echo "--repo <owner/name> required" >&2; exit 2; }

case "$CMD" in
  setup)
    # Make two commits on the ref, fast-forward style.
    # We record BOTH commit shas so verify can test:
    #   - tip survival (latest commit blob URL)
    #   - history reachability (parent commit blob URL — mirrors the wrapper's
    #     idempotency promise that re-runs don't break older PR-body image links)

    make_commit() {
      local label="$1" parent_sha="$2"
      local content blob_sha tree_sha
      content=$(printf "spike commit %s at %s\n" "$label" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" | base64)
      blob_sha=$(jq -n --arg c "$content" '{content:$c, encoding:"base64"}' \
        | gh api "repos/$REPO/git/blobs" --input - -q .sha)
      tree_sha=$(jq -n --arg sha "$blob_sha" --arg path "$TEST_PATH" \
        '{tree: [{path:$path, mode:"100644", type:"blob", sha:$sha}]}' \
        | gh api "repos/$REPO/git/trees" --input - -q .sha)
      if [[ -n "$parent_sha" ]]; then
        jq -n --arg t "$tree_sha" --arg p "$parent_sha" --arg m "spike: $label" \
          '{message:$m, tree:$t, parents:[$p]}' \
          | gh api "repos/$REPO/git/commits" --input - -q .sha
      else
        jq -n --arg t "$tree_sha" --arg m "spike: $label" \
          '{message:$m, tree:$t}' \
          | gh api "repos/$REPO/git/commits" --input - -q .sha
      fi
    }

    parent_commit=$(make_commit "parent" "")
    gh api "repos/$REPO/git/refs" --method POST \
      -f "ref=$REF" -f "sha=$parent_commit" >/dev/null

    tip_commit=$(make_commit "tip" "$parent_commit")
    # Fast-forward (PATCH; no force).
    gh api "repos/$REPO/git/refs/${REF#refs/}" --method PATCH \
      -f "sha=$tip_commit" >/dev/null

    parent_url="https://github.com/$REPO/blob/$parent_commit/$TEST_PATH?raw=true"
    tip_url="https://github.com/$REPO/blob/$tip_commit/$TEST_PATH?raw=true"

    jq -n \
      --arg repo "$REPO" --arg ref "$REF" \
      --arg parent "$parent_commit" --arg tip "$tip_commit" \
      --arg purl "$parent_url" --arg turl "$tip_url" \
      --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
      '{repo:$repo, ref:$ref, parentSha:$parent, tipSha:$tip, parentUrl:$purl, tipUrl:$turl, setupAt:$ts}' \
      > "$STATE_FILE"

    echo "Spike set up. State saved to $STATE_FILE"
    echo
    echo "Verify in 7 days with:"
    echo "  $0 verify --repo $REPO"
    echo
    echo "Manual checks (paste into a browser logged into GitHub):"
    echo "  Tip:    $tip_url"
    echo "  Parent: $parent_url   <- this is the durability-vs-history check"
    ;;

  verify)
    [[ -f "$STATE_FILE" ]] || { echo "no state at $STATE_FILE — did you run setup?" >&2; exit 2; }

    parent_sha=$(jq -r .parentSha "$STATE_FILE")
    tip_sha=$(jq -r .tipSha "$STATE_FILE")
    parent_url=$(jq -r .parentUrl "$STATE_FILE")
    tip_url=$(jq -r .tipUrl "$STATE_FILE")
    setup_at=$(jq -r .setupAt "$STATE_FILE")

    echo "Checking ref + history survival since $setup_at..."

    # 1. Does the ref still resolve to the tip commit?
    actual_sha=$(gh api "repos/$REPO/git/ref/${REF#refs/}" -q .object.sha 2>/dev/null || echo "")
    if [[ "$actual_sha" == "$tip_sha" ]]; then
      echo "  ✅ Ref tip present, sha matches: $actual_sha"
    elif [[ -z "$actual_sha" ]]; then
      echo "  ❌ Ref GONE — GitHub appears to have GC'd refs/uploads/* — fall back to refs/heads/attachments/*"
      exit 1
    else
      echo "  ⚠️  Ref exists but sha changed: $actual_sha (expected $tip_sha)"
    fi

    # 2. Is the PARENT commit still reachable? This is the real durability test
    # for the wrapper: PR bodies on older runs embed older shas.
    parent_check=$(gh api "repos/$REPO/git/commits/$parent_sha" -q .sha 2>/dev/null || echo "")
    if [[ "$parent_check" == "$parent_sha" ]]; then
      echo "  ✅ Parent commit still reachable: $parent_sha"
    else
      echo "  ❌ Parent commit GC'd — older PR bodies would 404 on their embed URLs."
      echo "     Fall back to a strategy that keeps blobs on refs/heads/*."
      exit 1
    fi

    # 3. Embed URL render checks (anonymous; private repos 404 here — manual browser check needed).
    tip_status=$(curl -sI -o /dev/null -w "%{http_code}" "$tip_url" || echo "000")
    parent_status=$(curl -sI -o /dev/null -w "%{http_code}" "$parent_url" || echo "000")
    echo "  Embed URLs (anonymous HTTP status):"
    echo "    Tip    $tip_status   $tip_url"
    echo "    Parent $parent_status   $parent_url"
    echo "  Manually verify both in a logged-in browser tab."

    echo
    echo "If all three checks pass → refs/uploads/pulls/<N> is safe for fe-design-pr."
    echo "If anything failed → switch fe-design-pr to refs/heads/attachments/pr-<N>."
    ;;

  *)
    echo "Usage: $0 {setup|verify} --repo <owner/name>" >&2
    exit 2
    ;;
esac
