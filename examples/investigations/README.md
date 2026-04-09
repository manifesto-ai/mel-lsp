# MEL Investigation Corpus

This tree is the canonical source of evidence for MEL domain-modeling investigations.

Use one folder per domain, with raw `.mel` files as the primary evidence and `findings.md` as the summary.

## Layout

- `baseline.mel` - a minimal valid domain for the scenario
- `repros/*.mel` - focused repro cases for a single suspected issue
- `findings.md` - expected vs actual notes for each repro

## Domains

- `bookmark-manager`
- `todo-workspace`
- `payment-ledger`
- `inventory-catalog`
- `approval-workflow`
- `profile-settings`

## Evidence Rules

- Keep examples minimal and focused on one issue class.
- Use raw `.mel` files only.
- Keep expected and actual behavior visible in `findings.md`.
- Do not duplicate this corpus under `vscode-mel/examples`.
