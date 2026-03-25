# @manifesto-ai/mel-lsp

Language Server Protocol implementation for [MEL (Manifesto Expression Language)](https://github.com/manifesto-ai).

## Features

### Phase 1 — Basic IDE Support
- **Diagnostics** — Real-time error and warning reporting via `@manifesto-ai/compiler`
- **Completion** — Context-aware suggestions for 150+ builtin functions, domain symbols, keywords, and system identifiers (`$system`, `$meta`, `$input`, `$item`)
- **Hover** — Documentation for builtins, keywords, and domain symbols
- **Signature Help** — Parameter hints for function calls
- **Document Symbols** — Outline of state, computed, action, and type declarations

### Phase 2 — Advanced Navigation
- **Go to Definition** — Jump to symbol declarations
- **Find References** — Locate all usages of a symbol
- **Rename Symbol** — Safe rename across all occurrences
- **Semantic Tokens** — AST-based syntax highlighting
- **Code Actions** — Quick fixes with fuzzy typo suggestions

### Phase 3 — AI-Native Schema Introspection
- `mel/schemaIntrospection` — Returns full compiled `DomainSchema` (state, computed, actions, types)
- `mel/actionSignatures` — Lightweight action metadata for LLM agent integration

## Installation

```bash
npm install @manifesto-ai/mel-lsp
```

## Usage

### As a standalone server

```bash
npx mel-lsp
```

The server communicates over **stdio** using the LSP protocol.

### VS Code Extension

The `vscode-mel` extension is included in the [`vscode-mel/`](./vscode-mel) directory.

1. Open the `vscode-mel/` folder in VS Code
2. Press `F5` to launch the Extension Development Host
3. Open any `.mel` file to activate the language server

**Extension features:**
- Syntax highlighting via TextMate grammar
- Full LSP integration (completions, hover, diagnostics, etc.)
- File watching for `**/*.mel` files

### With other editors

Any editor that supports LSP can use `mel-lsp`. Configure your editor to launch `mel-lsp` over stdio for files with the `.mel` extension.

## Development

```bash
pnpm install          # Install dependencies
pnpm build            # Build with tsup
pnpm dev              # Build in watch mode
pnpm test             # Run tests
pnpm test:watch       # Run tests in watch mode
```

## Architecture

```
src/
├── server.ts              # Main server entry point
├── capabilities.ts        # LSP capability declarations
├── compiler-bridge.ts     # @manifesto-ai/compiler wrapper with schema caching
├── document-manager.ts    # Document tracking
├── ast-utils.ts           # AST analysis utilities (scope, symbols)
├── registry/
│   ├── builtins.ts        # 150+ builtin function definitions
│   └── keywords.ts        # Keywords, system identifiers, snippets
└── providers/
    ├── diagnostics.ts     # Error/warning publishing
    ├── completion.ts      # Autocomplete
    ├── hover.ts           # Hover information
    ├── signature.ts       # Function parameter hints
    ├── symbols.ts         # Document outline
    ├── definition.ts      # Go to definition
    ├── references.ts      # Find all references
    ├── rename.ts          # Rename symbol
    ├── semantic-tokens.ts # AST-based highlighting
    ├── code-actions.ts    # Quick fixes
    └── introspection.ts   # AI schema introspection
```

## License

MIT
