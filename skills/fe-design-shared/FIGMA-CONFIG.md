# Figma Config

`figma.config.json` is the per-project (or per-package, in monorepos) configuration for fe-design-* skills.

## Single-package layout

```json
{
  "fileId": "qkxc...",
  "tokenEnv": "FIGMA_ACCESS_TOKEN",
  "cacheDir": ".fe-design-cache",
  "tokensPath": "src/ui/tokens.ts",
  "vrtThreshold": 0.05,
  "storybookPort": 6006,
  "codeConnect": {
    "parser": "react",
    "include": ["src/**/*.tsx"],
    "exclude": ["**/*.stories.tsx", "**/*.test.tsx", "node_modules/**"]
  }
}
```

## Monorepo layout

**Root config** — declares file aliases and shared options:

```json
{
  "tokenEnv": "FIGMA_ACCESS_TOKEN",
  "cacheDir": ".fe-design-cache",
  "files": {
    "ds":    "qkxc...A7",
    "app-1": "abc...",
    "app-2": "def..."
  },
  "mappingScope": "monorepo"
}
```

**Per-package config** — extends root, picks an alias, overrides as needed:

```json
{
  "extends": "../../figma.config.json",
  "fileId": "ds"
}
```

- `extends` resolves relative to the package config.
- Deep-merges keys; per-package values win.
- `fileId` may be either a raw Figma file id or an alias from the root's `files` map.

## Field reference

| Field | Type | Where | Notes |
|---|---|---|---|
| `extends` | string | per-package | Relative path to root config. |
| `fileId` | string | per-package | Raw id or alias. Required. |
| `files` | `Record<string, string>` | root | Alias → Figma fileId. |
| `tokenEnv` | string | either | Env var name for Figma access token. Default `"FIGMA_ACCESS_TOKEN"`. |
| `cacheDir` | string | either | Default `.fe-design-cache`. `vrt.mjs` writes `<cacheDir>/diff/{figma,code,diff}.png` (overwritten on each run, per-package in monorepos). Should be in `.gitignore`. |
| `tokensPath` | string | per-package | Path to design tokens file. Default `"src/ui/tokens.ts"`. |
| `vrtThreshold` | number | per-package | Diff ratio threshold (0–1) for VRT. Default `0.05`. Calibration by story size: see `fe-design-verify` SKILL.md `## Threshold guidance`. |
| `storybookPort` | number | per-package | Local Storybook port. Default `6006`. |
| `mappingScope` | `"monorepo" \| "package"` | root | Default `"monorepo"` if root has `files`, else `"package"`. |
| `codeConnect` | object | per-package | Code Connect parser config. |

## Resolution order

1. Load the nearest `figma.config.json` walking up from cwd.
2. If it has `extends`, load and merge the parent config.
3. Apply CLI overrides where supported (e.g. `vrt.mjs --ratio-threshold=...`).

Per-package values always win over root values for the same key.

## Rules

- **`fileId` is required.** Either a raw id or an alias listed in the root's `files`.
- **Don't commit secrets.** Tokens go in `.env`, not `figma.config.json`.
