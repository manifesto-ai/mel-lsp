# @manifesto-ai/mel-lsp

Language Server Protocol implementation for MEL.

Use it when you want editor support or authoring-time schema introspection for `.mel` files. It does not replace the runtime packages or project-bootstrap tools.

## Quick Start

```bash
npm install -D @manifesto-ai/mel-lsp
npx mel-lsp
```

The server communicates over stdio using the LSP protocol.

## What You Get

- diagnostics through `@manifesto-ai/compiler`
- completion, hover, signature help, symbols, definitions, references, and rename
- semantic tokens and code actions
- AI-native schema introspection methods for tool-hosted assistants

## Features

### Authoring Support

- **Diagnostics**: real-time error and warning reporting
- **Completion**: builtin functions, domain symbols, keywords, and system identifiers
- **Hover**: documentation for builtins, keywords, and domain symbols
- **Signature Help**: parameter hints for function calls
- **Document Symbols**: outline of state, computed, action, and type declarations
- **Go to Definition**: jump to symbol declarations
- **Find References**: locate all usages of a symbol
- **Rename Symbol**: safe rename across all occurrences
- **Semantic Tokens**: AST-based syntax highlighting
- **Code Actions**: quick fixes with fuzzy typo suggestions

### AI-Native Schema Introspection

- `mel/schemaIntrospection`: returns the full compiled `DomainSchema`
- `mel/actionSignatures`: returns lightweight action metadata for tool-hosted agents

## Usage

### As a Standalone Server

```bash
npx mel-lsp
```

### VS Code Extension

The `vscode-mel` extension is included in the [`vscode-mel/`](./vscode-mel) directory.

1. Open the `vscode-mel/` folder in VS Code
2. Press `F5` to launch the Extension Development Host
3. Open any `.mel` file to activate the language server

Extension features:

- syntax highlighting via TextMate grammar
- full LSP integration
- file watching for `**/*.mel` files

### With Other Editors

Any editor that supports LSP can use `mel-lsp`. Configure your editor to launch `mel-lsp` over stdio for files with the `.mel` extension.

## When To Reach For Something Else

- Use `@manifesto-ai/cli` when the missing piece is repo bootstrap or bundler integration.
- Use `@manifesto-ai/skills` when the missing piece is AI coding tool guidance.
- Use Studio packages when the missing piece is read-only inspection of snapshots, traces, lineage, or governance data.

## Development

```bash
pnpm install
pnpm build
pnpm dev
pnpm test
pnpm test:watch
```

## Architecture

```text
src/
├── server.ts              # Main server entry point
├── capabilities.ts        # LSP capability declarations
├── compiler-bridge.ts     # @manifesto-ai/compiler wrapper with schema caching
├── document-manager.ts    # Document tracking
├── ast-utils.ts           # AST analysis utilities (scope, symbols)
├── registry/
│   ├── builtins.ts        # Builtin function definitions
│   └── keywords.ts        # Keywords, system identifiers, snippets
└── providers/
    ├── diagnostics.ts     # Error and warning publishing
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
