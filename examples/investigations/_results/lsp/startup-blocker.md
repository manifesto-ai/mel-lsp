# LSP Startup Blocker

## Summary

Automated LSP collection is currently blocked because the stdio server exits before it responds to `initialize`.

The current consumer-side retest was run against the published npm pair:

- `@manifesto-ai/compiler` `1.8.2`
- `@manifesto-ai/core` `2.7.1`

## Evidence

### Collector failure

Command:

```bash
pnpm run investigate:lsp
```

Observed failure:

```text
Error: LSP server exited before initialize completed (code=1, signal=null)
```

### Existing E2E failure

Command:

```bash
pnpm vitest run src/e2e.test.ts
```

Observed failure:

```text
FAIL  src/e2e.test.ts > E2E: LSP Server over stdio
Error: Hook timed out in 10000ms.
```

The failure occurs during the `beforeAll` initialization path, before any document-level diagnostics are exercised.

## Current Interpretation

- This is an `lsp`-layer transport/startup issue, separate from the compiler's type-validation gaps.
- Compiler investigation can proceed independently via `compileMelDomain()`.
- Full LSP-vs-compiler parity checks remain blocked until stdio startup is fixed.
