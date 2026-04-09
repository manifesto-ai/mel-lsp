# Approval Workflow Findings

## Collection Note

- Compiler results were collected from `examples/investigations/_results/compiler`.
- LSP diagnostics were not collected: automated stdio collection currently fails because the server exits before `initialize`; `pnpm investigate:lsp` times out, and `pnpm vitest run src/e2e.test.ts` times out in `beforeAll`.

## Baseline

- Expected: compile cleanly with a valid schema.
- Actual (compiler): clean compile, `hasSchema=true`, no errors or warnings.
- Actual (LSP): not collected because the stdio collector is blocked.

## Action Parameter Type Mismatch

- Repro: `repros/action-param-type-mismatch.mel`
- Expected: reject assigning numeric action parameter to boolean patch target.
- Actual (compiler): rejected with `E_TYPE_MISMATCH`; `hasSchema=false`.
- Actual (LSP): not collected because the stdio collector is blocked.

## Non-Boolean Guard

- Repro: `repros/when-condition-non-bool.mel`
- Expected: reject numeric field used as a guard condition.
- Actual (compiler): rejected with `E_TYPE_MISMATCH`; `hasSchema=false`.
- Actual (LSP): not collected because the stdio collector is blocked.

## Cross-Type Comparison

- Repro: `repros/cross-type-comparison.mel`
- Expected: reject comparing a string request ID to a number.
- Actual (compiler): rejected with `E_TYPE_MISMATCH`; `hasSchema=false`.
- Actual (LSP): not collected because the stdio collector is blocked.
