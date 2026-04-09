# MEL Investigation Index

## Summary

- Corpus root: `examples/investigations`
- Compiler under test: `@manifesto-ai/compiler` `1.8.2` from npm
- Core under test: `@manifesto-ai/core` `2.7.1` from npm
- Total evidence files collected by compiler: 24 `.mel`
- Baselines: 6
- Negative repros: 18
- Negative repros rejected by compiler: 18
- Negative repros accepted cleanly with `hasSchema=true`: 0
- LSP automated collection status: blocked by stdio startup failure
- Audit note: `approval-workflow/repros/action-param-type-mismatch.mel` and `approval-workflow/repros/when-condition-non-bool.mel` were corrected on 2026-03-26 because their earlier contents were not actually negative cases.

## Delta Vs Earlier Releases

- `1.7.0` rejected only 1 of 18 negative repros.
- `1.8.0` rejected 6 of 18 negative repros.
- `1.8.2` rejects 18 of 18 negative repros.
- Coverage added in `1.8.0`:
  - direct state initializer mismatch
  - patch assignment mismatch
  - named type object field mismatch
  - nested object field mismatch
  - non-nullable field initialized with `null`
- Coverage added in `1.8.2`:
  - builtin argument typing
  - non-boolean guard rejection
  - cross-type comparison rejection
  - collection predicate typing
  - collection mapper typing
  - coalesce typing
  - patch assignment mismatch through typed action parameters

## What Currently Works

- All six baseline domains compile cleanly and produce schemas.
- All 18 negative repros in the current corpus are rejected.
  - Compiler result: `E_TYPE_MISMATCH` for 17 cases, `E_UNDEFINED` for the undefined identifier control case.
- Undefined identifier detection still works.
  - Evidence: `profile-settings/repros/undefined-identifier.mel`
  - Compiler result: `E_UNDEFINED`, `hasSchema=false`
- Existing repo-level evidence also suggests unknown function and wrong arity are covered elsewhere, but they were not the main focus of this corpus.

## Remaining Issue Inventory

| ID | Severity | Owner | Category | Evidence | Actual result |
| --- | --- | --- | --- | --- | --- |
| LSP-STARTUP-001 | High | lsp | Automated stdio server startup fails before `initialize` | `examples/investigations/_results/lsp/startup-blocker.md` | `pnpm run investigate:lsp` exits with `LSP server exited before initialize completed (code=1, signal=null)`; `pnpm vitest run src/e2e.test.ts` times out in `beforeAll` |

## Recently Improved In 1.8.0

| ID | Severity | Owner | Category | Evidence | Actual result |
| --- | --- | --- | --- | --- | --- |
| MEL-TYPE-001 | Resolved in 1.8.0 | compiler | State initializer type mismatch is now rejected | `bookmark-manager/repros/state-init-type-mismatch.mel`, `profile-settings/repros/nullable-state-type.mel` | `E_TYPE_MISMATCH`, `hasSchema=false` |
| MEL-TYPE-002 | Resolved in 1.8.0 | compiler | Patch assignment type mismatch is now rejected | `bookmark-manager/repros/patch-type-mismatch.mel` | `E_TYPE_MISMATCH`, `hasSchema=false` |
| MEL-TYPE-006 | Resolved in 1.8.0 | compiler | Named type and nested object field mismatches are now rejected | `todo-workspace/repros/named-type-field-mismatch.mel`, `inventory-catalog/repros/nested-object-type-mismatch.mel` | `E_TYPE_MISMATCH`, `hasSchema=false` |

## Recently Improved In 1.8.2

| ID | Severity | Owner | Category | Evidence | Actual result |
| --- | --- | --- | --- | --- | --- |
| MEL-TYPE-003 | Resolved in 1.8.2 | compiler | Builtin argument type mismatch is now rejected | `payment-ledger/repros/builtin-arg-type-mismatch.mel`, `inventory-catalog/repros/collection-mapper-type.mel`, `todo-workspace/repros/collection-mapper-type.mel` | `E_TYPE_MISMATCH`, `hasSchema=false` |
| MEL-TYPE-004 | Resolved in 1.8.2 | compiler | Non-boolean guard expressions are now rejected | `bookmark-manager/repros/guard-non-bool.mel`, `payment-ledger/repros/guard-non-bool.mel`, `approval-workflow/repros/when-condition-non-bool.mel` | `E_TYPE_MISMATCH`, `hasSchema=false` |
| MEL-TYPE-005 | Resolved in 1.8.2 | compiler | Cross-type comparison is now rejected | `payment-ledger/repros/cross-type-comparison.mel`, `approval-workflow/repros/cross-type-comparison.mel` | `E_TYPE_MISMATCH`, `hasSchema=false` |
| MEL-TYPE-007 | Resolved in 1.8.2 | compiler | Collection predicate and mapper typing are now enforced | `todo-workspace/repros/collection-predicate-type.mel`, `inventory-catalog/repros/collection-predicate-type.mel`, `todo-workspace/repros/collection-mapper-type.mel`, `inventory-catalog/repros/collection-mapper-type.mel` | `E_TYPE_MISMATCH`, `hasSchema=false` |
| MEL-TYPE-008 | Resolved in 1.8.2 | compiler | Coalesce typing is now enforced | `profile-settings/repros/coalesce-type-mismatch.mel` | `E_TYPE_MISMATCH`, `hasSchema=false` |

## Domain Notes

- `bookmark-manager`
  - Good for primitive state, patch, and guard semantics.
  - Current corpus rejects primitive declaration, patch, and numeric guard mismatches.
- `todo-workspace`
  - Good for named types and collection callbacks.
  - Current corpus rejects named object field mismatches and `filter/map` callback typing errors.
- `payment-ledger`
  - Good for numeric builtins and comparisons.
  - Current corpus rejects numeric builtin misuse, cross-type comparison, and numeric guard misuse.
- `inventory-catalog`
  - Good for nested records and collection callbacks on object arrays.
  - Current corpus rejects nested object field typing and collection callback typing errors.
- `approval-workflow`
  - Good for action parameters and workflow guards.
  - Current corpus rejects parameter-driven patch mismatch, non-boolean guard, and cross-type comparison.
- `profile-settings`
  - Good control domain because it includes one repro the compiler does reject.
  - Current corpus rejects nullability mismatch, coalesce typing mismatch, and undefined identifiers.

## Escalation Notes

- Primary escalation target is `@manifesto-ai/compiler` / MEL semantic validation, not the VS Code wrapper.
- This corpus no longer reproduces an open compiler semantic-validation gap on the published npm pair `@manifesto-ai/compiler 1.8.2` + `@manifesto-ai/core 2.7.1`.
- The strongest summary metric is now: 18 of 18 negative repros are rejected.
- Future compiler investigation should expand the corpus beyond the current baseline instead of repeating the original gap list.
- The LSP startup blocker should be tracked separately from compiler typing gaps so transport issues do not mask semantic-validation work.

## Evidence Paths

- Compiler summary: `examples/investigations/_results/compiler/index.json`
- LSP blocker note: `examples/investigations/_results/lsp/startup-blocker.md`
- Per-domain findings:
  - `examples/investigations/bookmark-manager/findings.md`
  - `examples/investigations/todo-workspace/findings.md`
  - `examples/investigations/payment-ledger/findings.md`
  - `examples/investigations/inventory-catalog/findings.md`
  - `examples/investigations/approval-workflow/findings.md`
  - `examples/investigations/profile-settings/findings.md`
