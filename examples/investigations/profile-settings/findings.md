# Profile Settings Findings

## Collection Note

- Compiler results were collected from `examples/investigations/_results/compiler`.
- LSP diagnostics were not collected: automated stdio collection currently fails because the server exits before `initialize`; `pnpm investigate:lsp` times out, and `pnpm vitest run src/e2e.test.ts` times out in `beforeAll`.

## Baseline

- Expected: compile cleanly with a valid schema.
- Actual (compiler): clean compile, `hasSchema=true`, no errors or warnings.
- Actual (LSP): not collected because the stdio collector is blocked.

## Nullable State Type

- Repro: `repros/nullable-state-type.mel`
- Expected: reject `null` initialization for a non-nullable `string`.
- Actual (compiler): rejected with `E_TYPE_MISMATCH`; `hasSchema=false`.
- Actual (LSP): not collected because the stdio collector is blocked.

## Coalesce Type Mismatch

- Repro: `repros/coalesce-type-mismatch.mel`
- Expected: reject `boolean` fallback in a string-oriented `coalesce`.
- Actual (compiler): rejected with `E_TYPE_MISMATCH`; `hasSchema=false`.
- Actual (LSP): not collected because the stdio collector is blocked.

## Undefined Identifier

- Repro: `repros/undefined-identifier.mel`
- Expected: reject unknown identifier access in computed expression.
- Actual (compiler): `E_UNDEFINED` for `missingEmail`; `hasSchema=false`.
- Actual (LSP): not collected because the stdio collector is blocked.
