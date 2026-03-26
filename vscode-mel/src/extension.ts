import * as fs from "fs";
import * as path from "path";
import {
  window,
  workspace,
  type ExtensionContext,
  type OutputChannel,
} from "vscode";
import {
  LanguageClient,
  type LanguageClientOptions,
  type ServerOptions,
  TransportKind,
} from "vscode-languageclient/node";

let client: LanguageClient | undefined;
let outputChannel: OutputChannel | undefined;

export async function activate(context: ExtensionContext) {
  outputChannel = window.createOutputChannel("Manifesto MEL");

  const packagedServerModule = context.asAbsolutePath(path.join("server", "server.js"));
  const localServerModule = context.asAbsolutePath(path.join("..", "bin", "mel-lsp.js"));

  const serverModule = [packagedServerModule, localServerModule].find((candidate) =>
    fs.existsSync(candidate)
  );

  if (!serverModule) {
    const message =
      "Manifesto MEL could not start the MEL language server because no packaged server module was found.";
    outputChannel.appendLine(message);
    outputChannel.appendLine(`Expected packaged server at: ${packagedServerModule}`);
    outputChannel.appendLine(`Expected local dev server at: ${localServerModule}`);
    outputChannel.show(true);
    void window.showErrorMessage(message);
    return;
  }

  outputChannel.appendLine(`Starting MEL language server from: ${serverModule}`);

  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.stdio },
    debug: { module: serverModule, transport: TransportKind.stdio },
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: "file", language: "mel" }],
    outputChannel,
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

  try {
    await client.start();
  } catch (error) {
    const detail = error instanceof Error ? error.stack ?? error.message : String(error);
    outputChannel.appendLine("Failed to start MEL language server.");
    outputChannel.appendLine(detail);
    outputChannel.show(true);
    void window.showErrorMessage(
      "Manifesto MEL failed to start the language server. See the 'Manifesto MEL' output for details."
    );
    throw error;
  }
}

export function deactivate(): Thenable<void> | undefined {
  return client?.stop();
}
