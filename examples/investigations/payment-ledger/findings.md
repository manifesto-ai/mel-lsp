# Payment Ledger Findings

## Collection Note

- Compiler results were collected from `examples/investigations/_results/compiler`.
- LSP diagnostics were not collected: automated stdio collection currently fails because the server exits before `initialize`; `pnpm investigate:lsp` times out, and `pnpm vitest run src/e2e.test.ts` times out in `beforeAll`.

## Baseline

- Expected: compile cleanly with a valid schema.
- Actual (compiler): clean compile, `hasSchema=true`, no errors or warnings.
- Actual (LSP): not collected because the stdio collector is blocked.

## Builtin Argument Type Mismatch

- Repro: `repros/builtin-arg-type-mismatch.mel`
- Expected: reject string input to numeric `add`.
- Actual (compiler): rejected with `E_TYPE_MISMATCH`; `hasSchema=false`.
- Actual (LSP): not collected because the stdio collector is blocked.

## Cross-Type Comparison

- Repro: `repros/cross-type-comparison.mel`
- Expected: reject comparing a number to a string.
- Actual (compiler): rejected with `E_TYPE_MISMATCH`; `hasSchema=false`.
- Actual (LSP): not collected because the stdio collector is blocked.

## Non-Boolean Guard

- Repro: `repros/guard-non-bool.mel`
- Expected: reject numeric guard or at least warn with type-aware context.
- Actual (compiler): rejected with `E_TYPE_MISMATCH`; `hasSchema=false`.
- Actual (LSP): not collected because the stdio collector is blocked.
