import { spawn } from "node:child_process";

const HEADER_DELIM = Buffer.from("\r\n\r\n");

export class LspClient {
  constructor(serverPath, rootUri = null) {
    this.serverPath = serverPath;
    this.rootUri = rootUri;
    this.buf = Buffer.alloc(0);
    this.stderr = "";
    this.messageId = 0;
    this.pending = new Map();
    this.notifications = [];
  }

  async start() {
    this.server = spawn("node", [this.serverPath], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    this.server.stdout.on("data", (data) => this.handleData(data));
    this.server.stderr.on("data", (data) => {
      const text = data.toString("utf8");
      this.stderr += text;
      process.stderr.write(text);
    });
    this.server.on("exit", (code, signal) => {
      this.failPending(
        this.formatServerError(
          `LSP server exited during startup (code=${code}, signal=${signal ?? "null"})`
        )
      );
    });
    this.server.on("error", (error) => {
      this.failPending(this.formatServerError(error.message));
    });

    await new Promise((resolve, reject) => {
      this.server.once("spawn", resolve);
      this.server.once("error", reject);
    });

    const result = await this.sendRequest("initialize", {
      processId: process.pid,
      rootUri: this.rootUri,
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
    });

    if (!result?.capabilities) {
      throw new Error(this.formatServerError("LSP initialize failed"));
    }

    this.sendNotification("initialized", {});
  }

  async openDocument(uri, text) {
    this.notifications.length = 0;
    this.sendNotification("textDocument/didOpen", {
      textDocument: { uri, languageId: "mel", version: 1, text },
    });
    return await this.waitForNotification("textDocument/publishDiagnostics");
  }

  close() {
    if (this.server && !this.server.killed) {
      this.server.kill();
    }
  }

  sendRequest(method, params) {
    return new Promise((resolve, reject) => {
      const id = ++this.messageId;
      this.pending.set(id, { resolve, reject });
      this.send({ jsonrpc: "2.0", id, method, params });
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(
            new Error(this.formatServerError(`Request ${method} (id=${id}) timed out`))
          );
        }
      }, 10000);
    });
  }

  sendNotification(method, params) {
    this.send({ jsonrpc: "2.0", method, params });
  }

  waitForNotification(method, timeoutMs = 5000) {
    const idx = this.notifications.findIndex((n) => n.method === method);
    if (idx !== -1) {
      return Promise.resolve(this.notifications.splice(idx, 1)[0].params);
    }

    return new Promise((resolve, reject) => {
      const start = Date.now();
      const check = () => {
        const idx2 = this.notifications.findIndex((n) => n.method === method);
        if (idx2 !== -1) {
          resolve(this.notifications.splice(idx2, 1)[0].params);
          return;
        }
        if (Date.now() - start > timeoutMs) {
          reject(
            new Error(
              this.formatServerError(`Notification ${method} timed out`)
            )
          );
          return;
        }
        setTimeout(check, 20);
      };
      setTimeout(check, 20);
    });
  }

  send(msg) {
    const json = JSON.stringify(msg);
    const header = `Content-Length: ${Buffer.byteLength(json, "utf8")}\r\n\r\n`;
    this.server.stdin.write(header + json);
  }

  failPending(message) {
    const error = new Error(message);
    for (const pending of this.pending.values()) {
      pending.reject(error);
    }
    this.pending.clear();
  }

  formatServerError(message) {
    const stderr = this.stderr.trim();
    if (!stderr) return message;
    return `${message}\n--- stderr ---\n${stderr}`;
  }

  handleData(data) {
    this.buf = Buffer.concat([this.buf, data]);

    while (true) {
      const delimIdx = this.buf.indexOf(HEADER_DELIM);
      if (delimIdx === -1) break;

      const header = this.buf.subarray(0, delimIdx).toString("utf8");
      const match = header.match(/Content-Length:\s*(\d+)/i);
      if (!match) {
        this.buf = this.buf.subarray(delimIdx + 4);
        continue;
      }

      const contentLength = Number.parseInt(match[1], 10);
      const bodyStart = delimIdx + 4;
      if (this.buf.length < bodyStart + contentLength) break;

      const body = this.buf
        .subarray(bodyStart, bodyStart + contentLength)
        .toString("utf8");
      this.buf = this.buf.subarray(bodyStart + contentLength);

      try {
        const msg = JSON.parse(body);
        if ("id" in msg && this.pending.has(msg.id)) {
          const pending = this.pending.get(msg.id);
          this.pending.delete(msg.id);
          if (msg.error) pending.reject(new Error(msg.error.message));
          else pending.resolve(msg.result);
        } else if ("method" in msg && !("id" in msg)) {
          this.notifications.push({ method: msg.method, params: msg.params });
        }
      } catch {
        // ignore malformed messages
      }
    }
  }
}
