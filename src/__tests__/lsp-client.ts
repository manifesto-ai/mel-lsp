/**
 * Reusable LSP Test Client
 *
 * Spawns the MEL LSP server and provides typed helpers
 * for sending JSON-RPC requests/notifications over stdio.
 */

import { spawn, type ChildProcess } from "node:child_process";
import { resolve } from "node:path";

const HEADER_DELIM = Buffer.from("\r\n\r\n");

export class LspTestClient {
  private server!: ChildProcess;
  private buf = Buffer.alloc(0);
  private messageId = 0;
  private pending = new Map<
    number,
    { resolve: (v: unknown) => void; reject: (e: Error) => void }
  >();
  private notifications: Array<{ method: string; params: unknown }> = [];

  async start(): Promise<void> {
    const serverPath = resolve(
      import.meta.dirname,
      "../../dist/server.js"
    );
    this.server = spawn("node", [serverPath, "--stdio"], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    this.server.stdout!.on("data", (data: Buffer) => this.handleData(data));

    const result = (await this.sendRequest("initialize", {
      processId: process.pid,
      capabilities: {
        textDocument: {
          completion: { completionItem: {} },
          hover: { contentFormat: ["markdown"] },
          signatureHelp: {},
          documentSymbol: {},
          codeAction: {},
          definition: {},
          references: {},
          rename: { prepareSupport: true },
          semanticTokens: {},
        },
      },
      rootUri: null,
    })) as { capabilities: Record<string, unknown> };

    if (!result.capabilities) throw new Error("Initialize failed");
    this.sendNotification("initialized", {});
  }

  close(): void {
    if (this.server && !this.server.killed) {
      this.server.kill();
    }
  }

  // ============ High-level helpers ============

  async openDocument(
    uri: string,
    text: string
  ): Promise<{ uri: string; diagnostics: Diag[] }> {
    this.notifications.length = 0;
    this.sendNotification("textDocument/didOpen", {
      textDocument: { uri, languageId: "mel", version: 1, text },
    });
    return (await this.waitForNotification(
      "textDocument/publishDiagnostics"
    )) as { uri: string; diagnostics: Diag[] };
  }

  async changeDocument(
    uri: string,
    version: number,
    text: string
  ): Promise<{ uri: string; diagnostics: Diag[] }> {
    this.notifications.length = 0;
    this.sendNotification("textDocument/didChange", {
      textDocument: { uri, version },
      contentChanges: [{ text }],
    });
    return (await this.waitForNotification(
      "textDocument/publishDiagnostics"
    )) as { uri: string; diagnostics: Diag[] };
  }

  async completion(uri: string, line: number, character: number) {
    return (await this.sendRequest("textDocument/completion", {
      textDocument: { uri },
      position: { line, character },
    })) as CompletionItem[];
  }

  async hover(uri: string, line: number, character: number) {
    return (await this.sendRequest("textDocument/hover", {
      textDocument: { uri },
      position: { line, character },
    })) as { contents: { kind: string; value: string } } | null;
  }

  async signatureHelp(uri: string, line: number, character: number) {
    return (await this.sendRequest("textDocument/signatureHelp", {
      textDocument: { uri },
      position: { line, character },
    })) as {
      signatures: Array<{ label: string }>;
      activeParameter: number;
    } | null;
  }

  async documentSymbol(uri: string) {
    return (await this.sendRequest("textDocument/documentSymbol", {
      textDocument: { uri },
    })) as DocSymbol[];
  }

  async definition(uri: string, line: number, character: number) {
    return (await this.sendRequest("textDocument/definition", {
      textDocument: { uri },
      position: { line, character },
    })) as Location | null;
  }

  async references(
    uri: string,
    line: number,
    character: number,
    includeDeclaration = true
  ) {
    return (await this.sendRequest("textDocument/references", {
      textDocument: { uri },
      position: { line, character },
      context: { includeDeclaration },
    })) as Location[] | null;
  }

  async rename(uri: string, line: number, character: number, newName: string) {
    return (await this.sendRequest("textDocument/rename", {
      textDocument: { uri },
      position: { line, character },
      newName,
    })) as { changes: Record<string, TextEditItem[]> } | null;
  }

  async prepareRename(uri: string, line: number, character: number) {
    return (await this.sendRequest("textDocument/prepareRename", {
      textDocument: { uri },
      position: { line, character },
    })) as { range: Range; placeholder: string } | null;
  }

  async semanticTokensFull(uri: string) {
    return (await this.sendRequest("textDocument/semanticTokens/full", {
      textDocument: { uri },
    })) as { data: number[] };
  }

  async codeAction(uri: string, diagnostics: Diag[]) {
    const range = diagnostics[0]?.range ?? {
      start: { line: 0, character: 0 },
      end: { line: 0, character: 0 },
    };
    return (await this.sendRequest("textDocument/codeAction", {
      textDocument: { uri },
      range,
      context: { diagnostics },
    })) as Array<{ title: string; edit?: unknown }>;
  }

  // ============ Low-level protocol ============

  sendRequest(method: string, params?: unknown): Promise<unknown> {
    return new Promise((resolveP, rejectP) => {
      const id = ++this.messageId;
      this.pending.set(id, { resolve: resolveP, reject: rejectP });
      this.send({ jsonrpc: "2.0", id, method, params });
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          rejectP(new Error(`Request ${method} (id=${id}) timed out`));
        }
      }, 10_000);
    });
  }

  sendNotification(method: string, params?: unknown): void {
    this.send({ jsonrpc: "2.0", method, params });
  }

  waitForNotification(method: string, timeoutMs = 5000): Promise<unknown> {
    const idx = this.notifications.findIndex((n) => n.method === method);
    if (idx !== -1) {
      return Promise.resolve(this.notifications.splice(idx, 1)[0].params);
    }
    return new Promise((resolveP, rejectP) => {
      const start = Date.now();
      const check = () => {
        const idx = this.notifications.findIndex((n) => n.method === method);
        if (idx !== -1) {
          resolveP(this.notifications.splice(idx, 1)[0].params);
        } else if (Date.now() - start > timeoutMs) {
          rejectP(new Error(`Notification ${method} timed out`));
        } else {
          setTimeout(check, 20);
        }
      };
      setTimeout(check, 20);
    });
  }

  private send(msg: object): void {
    const json = JSON.stringify(msg);
    const header = `Content-Length: ${Buffer.byteLength(json, "utf-8")}\r\n\r\n`;
    this.server.stdin!.write(header + json);
  }

  private handleData(data: Buffer): void {
    this.buf = Buffer.concat([this.buf, data]);

    while (true) {
      const delimIdx = this.buf.indexOf(HEADER_DELIM);
      if (delimIdx === -1) break;

      const header = this.buf.subarray(0, delimIdx).toString("utf-8");
      const match = header.match(/Content-Length:\s*(\d+)/i);
      if (!match) {
        this.buf = this.buf.subarray(delimIdx + 4);
        continue;
      }

      const contentLength = parseInt(match[1], 10);
      const bodyStart = delimIdx + 4;
      if (this.buf.length < bodyStart + contentLength) break;

      const body = this.buf
        .subarray(bodyStart, bodyStart + contentLength)
        .toString("utf-8");
      this.buf = this.buf.subarray(bodyStart + contentLength);

      try {
        const msg = JSON.parse(body);
        if ("id" in msg && this.pending.has(msg.id)) {
          const p = this.pending.get(msg.id)!;
          this.pending.delete(msg.id);
          if (msg.error) p.reject(new Error(msg.error.message));
          else p.resolve(msg.result);
        } else if ("method" in msg && !("id" in msg)) {
          this.notifications.push({ method: msg.method, params: msg.params });
        }
      } catch {
        // ignore
      }
    }
  }
}

// ============ Types ============

export interface Diag {
  range: Range;
  severity: number;
  code?: string;
  message: string;
  source?: string;
}

export interface Range {
  start: { line: number; character: number };
  end: { line: number; character: number };
}

export interface Location {
  uri: string;
  range: Range;
}

export interface CompletionItem {
  label: string;
  kind: number;
  detail?: string;
  documentation?: unknown;
  insertText?: string;
}

export interface TextEditItem {
  range: Range;
  newText: string;
}

export interface DocSymbol {
  name: string;
  kind: number;
  range: Range;
  selectionRange: Range;
  children?: DocSymbol[];
}
