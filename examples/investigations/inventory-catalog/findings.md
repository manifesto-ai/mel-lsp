# Inventory Catalog Findings

## Collection Note

- Compiler results were collected from `examples/investigations/_results/compiler`.
- LSP diagnostics were not collected: automated stdio collection currently fails because the server exits before `initialize`; `pnpm investigate:lsp` times out, and `pnpm vitest run src/e2e.test.ts` times out in `beforeAll`.

## Baseline

- Expected: compile cleanly with a valid schema.
- Actual (compiler): clean compile, `hasSchema=true`, no errors or warnings.
- Actual (LSP): not collected because the stdio collector is blocked.

## Nested Object Type Mismatch

- Repro: `repros/nested-object-type-mismatch.mel`
- Expected: reject `stock: "ten"` for `stock: number`.
- Actual (compiler): rejected with `E_TYPE_MISMATCH`; `hasSchema=false`.
- Actual (LSP): not collected because the stdio collector is blocked.

## Collection Predicate Type

- Repro: `repros/collection-predicate-type.mel`
- Expected: reject string predicate in `filter`.
- Actual (compiler): rejected with `E_TYPE_MISMATCH`; `hasSchema=false`.
- Actual (LSP): not collected because the stdio collector is blocked.

## Collection Mapper Type

- Repro: `repros/collection-mapper-type.mel`
- Expected: reject arithmetic on a string field inside `map`.
- Actual (compiler): rejected with `E_TYPE_MISMATCH`; `hasSchema=false`.
- Actual (LSP): not collected because the stdio collector is blocked.
