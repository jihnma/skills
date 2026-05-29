# Storybook bootstrap

The wrapper auto-starts Storybook in the background if it isn't reachable, then polls until ready. This differs from `figma-to-react`'s "never auto-start" rule — the wrapper exists for unattended issue-to-PR runs where blocking the user on `pnpm storybook &` defeats the purpose. The child skill still gets a reachable Storybook either way; only the lifecycle owner differs.

## Precheck flow

1. Probe `http://localhost:<port>/iframe.html` (port from `figma.config.json#storybookPort`, default 6006). Reachable → done.
2. If unreachable, **detect the package manager** (see below) and spawn Storybook as a detached background process.
3. Poll the same URL every 2s for up to **60s**. Reachable → proceed with the wrapper workflow.
4. Still unreachable after 60s → exit with the spawn log path so the user can debug. Do not retry.

## Package manager detection

In order:
1. `packageManager` field in `package.json` (e.g. `"packageManager": "pnpm@9.0.0"` → `pnpm`).
2. Lockfile at repo root: `pnpm-lock.yaml` → `pnpm`; `yarn.lock` → `yarn`; `package-lock.json` → `npm`; `bun.lockb` → `bun`.
3. No signal → default `pnpm` (matches figma-to-react's documented expectation).

## Spawn command

Run with `nohup` (or `setsid`) so the process survives the wrapper exit and is available for the next call. Suppress browser open via the `--no-open` flag (works for the official `storybook` CLI from v7+).

**Trust note**: this runs `package.json#scripts.storybook` verbatim — same trust boundary as `pnpm install` already gave the repo. The wrapper does not sandbox the script; if the user wouldn't run `pnpm storybook` by hand, they shouldn't run design-issue-to-pr in this repo either.

```sh
mkdir -p .figma-react-cache
LOG=".figma-react-cache/storybook.log"
nohup <pm> storybook --no-open > "$LOG" 2>&1 &
disown
echo "Storybook spawned (pid $!), logs at $LOG"
```

Variants for older configs:
- `npm run storybook -- --no-open` (npm script wrapper)
- `yarn storybook --no-open`
- `pnpm storybook --no-open`
- `bun storybook --no-open`

If `--no-open` is rejected (older Storybook versions), retry without the flag — the browser opens but the wrapper doesn't care.

## Polling

```sh
for i in $(seq 1 30); do
  if curl -sf "http://localhost:${port}/iframe.html" > /dev/null; then
    break
  fi
  sleep 2
done
```

Exit early on first 200. If the loop finishes without success, the wrapper exits with:

```
Storybook auto-start timed out after 60s.
Logs: .figma-react-cache/storybook.log
Run <pm> storybook manually and re-invoke design-issue-to-pr.
```

## Lifecycle

The wrapper does **not** kill Storybook on exit. It persists for subsequent calls (faster startup), and the user can shut it down when done with `pkill -f 'storybook'` or by closing their terminal session. The wrapper reports the spawned PID + log path so the user knows what's running.

## Why not inherit figma-to-react's rule?

`figma-to-react` is invoked directly by humans pasting a Figma URL — those humans already have Storybook open in the same dev session. The wrapper is invoked unattended on an issue; expecting the user to pre-start Storybook breaks the AFK promise. Different invocation context → different precondition handling.
