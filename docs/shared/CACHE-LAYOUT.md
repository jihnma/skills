# Cache Layout

`.fe-design-cache/` holds runtime images used by `fe-design-verify` (and `fe-design-implement`'s auto-verify step). Path is configurable via `figma.config.json#cacheDir` (default `.fe-design-cache`). See [FIGMA-CONFIG](./FIGMA-CONFIG.md).

## Directory structure

```
.fe-design-cache/
└── diff/                          # vrt.mjs output for the latest VRT call
    ├── figma.png                  # Figma node export at scale=2, flattened on white
    ├── code.png                   # Storybook screenshot at DSF=2
    └── diff.png                   # pixelmatch output
```

`vrt.mjs` writes to `--output` (default `.fe-design-cache/diff`). Older runs are overwritten — there is no per-call history.

## Monorepo placement

In a monorepo each package writes to its own `.fe-design-cache/` because runs are invoked from the package's cwd. No shared root cache is needed — Figma image fetches are cheap and idempotent.

## Retention

| Artifact | Retention |
|---|---|
| `.fe-design-cache/diff/*.png` | Overwritten on the next run. User may delete the directory at any time. |

## .gitignore

The cache directory should be in `.gitignore`. The skills do not enforce this — it is the user's responsibility.

## Rules

- **Stateless.** No session files, no locks, no diff history. Every invocation overwrites the previous one.
- **Cache is per-package.** No shared root cache in monorepos.
