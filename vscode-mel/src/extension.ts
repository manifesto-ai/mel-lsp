import * as path from "path";
import { workspace, type ExtensionContext } from "vscode";
import {
  LanguageClient,
  type LanguageClientOptions,
  type ServerOptions,
  TransportKind,
} from "vscode-languageclient/node";

let client: LanguageClient | undefined;

export function activate(context: ExtensionContext) {
  // Resolve the mel-lsp server binary.
  // When installed as a dependency: node_modules/@manifesto-ai/mel-lsp/bin/mel-lsp.js
  // When developing locally: ../bin/mel-lsp.js
  const serverModule =
    context.asAbsolutePath(
      path.join("node_modules", "@manifesto-ai", "mel-lsp", "bin", "mel-lsp.js")
    ) || context.asAbsolutePath(path.join("..", "bin", "mel-lsp.js"));

  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.stdio },
    debug: { module: serverModule, transport: TransportKind.stdio },
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: "file", language: "mel" }],
    synchronize: {
      fileEvents: workspace.createFileSystemWatcher("**/*.mel"),
    },
  };

  client = new LanguageClient(
    "mel-lsp",
    "MEL Language Server",
    serverOptions,
    clientOptions
  );

  client.start();
}

export function deactivate(): Thenable<void> | undefined {
  return client?.stop();
}
