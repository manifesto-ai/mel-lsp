/**
 * E2E test: spawn the actual LSP server over stdio and send JSON-RPC messages.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawn, type ChildProcess } from "node:child_process";
import { resolve } from "node:path";

let server: ChildProcess;
let messageId = 0;
let buf = Buffer.alloc(0);
const pending = new Map<
  number,
  { resolve: (v: unknown) => void; reject: (e: Error) => void }
>();
const notifications: Array<{ method: string; params: unknown }> = [];

function nextId() {
  return ++messageId;
}

function send(msg: object) {
  const json = JSON.stringify(msg);
  const header = `Content-Length: ${Buffer.byteLength(json, "utf-8")}\r\n\r\n`;
  server.stdin!.write(header + json);
}

function sendRequest(method: string, params?: unknown): Promise<unknown> {
  return new Promise((resolveP, rejectP) => {
    const id = nextId();
    pending.set(id, { resolve: resolveP, reject: rejectP });
    send({ jsonrpc: "2.0", id, method, params });
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        rejectP(new Error(`Request ${method} (id=${id}) timed out`));
      }
    }, 10_000);
  });
}

function sendNotification(method: string, params?: unknown) {
  send({ jsonrpc: "2.0", method, params });
}

function waitForNotification(
  method: string,
  timeoutMs = 5000
): Promise<unknown> {
  const idx = notifications.findIndex((n) => n.method === method);
  if (idx !== -1) {
    return Promise.resolve(notifications.splice(idx, 1)[0].params);
  }

  return new Promise((resolveP, rejectP) => {
    const start = Date.now();
    const check = () => {
      const idx = notifications.findIndex((n) => n.method === method);
      if (idx !== -1) {
        resolveP(notifications.splice(idx, 1)[0].params);
      } else if (Date.now() - start > timeoutMs) {
        rejectP(new Error(`Notification ${method} timed out`));
      } else {
        setTimeout(check, 20);
      }
    };
    setTimeout(check, 20);
  });
}

const HEADER_DELIM = Buffer.from("\r\n\r\n");

function handleData(data: Buffer) {
  buf = Buffer.concat([buf, data]);

  while (true) {
    const delimIdx = buf.indexOf(HEADER_DELIM);
    if (delimIdx === -1) break;

    const header = buf.subarray(0, delimIdx).toString("utf-8");
    const match = header.match(/Content-Length:\s*(\d+)/i);
    if (!match) {
      // Skip malformed header
      buf = buf.subarray(delimIdx + 4);
      continue;
    }

    const contentLength = parseInt(match[1], 10);
    const bodyStart = delimIdx + 4;

    if (buf.length < bodyStart + contentLength) break; // wait for more data

    const body = buf.subarray(bodyStart, bodyStart + contentLength).toString("utf-8");
    buf = buf.subarray(bodyStart + contentLength);

    try {
      const msg = JSON.parse(body);
      if ("id" in msg && pending.has(msg.id)) {
        const p = pending.get(msg.id)!;
        pending.delete(msg.id);
        if (msg.error) {
          p.reject(new Error(msg.error.message));
        } else {
          p.resolve(msg.result);
        }
      } else if ("method" in msg && !("id" in msg)) {
        notifications.push({ method: msg.method, params: msg.params });
      }
    } catch {
      // Ignore parse errors
    }
  }
}

const COUNTER_MEL = `domain Counter {
  state {
    count: number = 0
    name: string = ""
  }

  computed doubled = mul(count, 2)
  computed isPositive = gt(count, 0)

  action increment() {
    when gt(count, 0) {
      patch count = add(count, 1)
    }
  }

  action reset() {
    when gt(count, 0) {
      patch count = 0
    }
  }
}`;

const BROKEN_MEL = `domain Broken {
  state {
    count: number = 0
  }
  computed bad = unknownFunc(count)
}`;

describe("E2E: LSP Server over stdio", { timeout: 30_000 }, () => {
  beforeAll(async () => {
    const serverPath = resolve(import.meta.dirname, "../dist/server.js");
    server = spawn("node", [serverPath, "--stdio"], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    server.stdout!.on("data", handleData);

    const initResult = (await sendRequest("initialize", {
      processId: process.pid,
      capabilities: {
        textDocument: {
          completion: { completionItem: {} },
          hover: { contentFormat: ["markdown"] },
          signatureHelp: {},
          documentSymbol: {},
        },
      },
      rootUri: null,
    })) as { capabilities: Record<string, unknown> };
    expect(initResult.capabilities).toBeDefined();

    sendNotification("initialized", {});
  });

  afterAll(() => {
    if (server && !server.killed) {
      server.kill();
    }
  });

  it("should initialize with expected capabilities", () => {
    expect(server.killed).toBe(false);
  });

  it("should publish diagnostics on didOpen (valid MEL)", async () => {
    notifications.length = 0;

    sendNotification("textDocument/didOpen", {
      textDocument: {
        uri: "file:///counter.mel",
        languageId: "mel",
        version: 1,
        text: COUNTER_MEL,
      },
    });

    const params = (await waitForNotification(
      "textDocument/publishDiagnostics"
    )) as { uri: string; diagnostics: unknown[] };

    expect(params.uri).toBe("file:///counter.mel");
    const errors = (params.diagnostics as Array<{ severity: number }>).filter(
      (d) => d.severity === 1
    );
    expect(errors).toHaveLength(0);
  });

  it("should publish error diagnostics for broken MEL", async () => {
    notifications.length = 0;

    sendNotification("textDocument/didOpen", {
      textDocument: {
        uri: "file:///broken.mel",
        languageId: "mel",
        version: 1,
        text: BROKEN_MEL,
      },
    });

    const params = (await waitForNotification(
      "textDocument/publishDiagnostics"
    )) as {
      uri: string;
      diagnostics: Array<{ severity: number; message: string }>;
    };

    expect(params.uri).toBe("file:///broken.mel");
    const errors = params.diagnostics.filter((d) => d.severity === 1);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toMatch(/unknown|unknownFunc/i);
  });

  it("should return completions", async () => {
    const result = (await sendRequest("textDocument/completion", {
      textDocument: { uri: "file:///counter.mel" },
      position: { line: 6, character: 25 },
    })) as Array<{ label: string; kind: number }>;

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);

    const labels = result.map((i) => i.label);
    expect(labels).toContain("add");
    expect(labels).toContain("filter");
    expect(labels).toContain("count");
    expect(labels).toContain("name");
  });

  it("should return hover for builtin function", async () => {
    const result = (await sendRequest("textDocument/hover", {
      textDocument: { uri: "file:///counter.mel" },
      position: { line: 6, character: 22 },
    })) as { contents: { kind: string; value: string } } | null;

    expect(result).not.toBeNull();
    expect(result!.contents.value).toContain("mul");
    expect(result!.contents.value).toContain("number");
  });

  it("should return hover for state field", async () => {
    const result = (await sendRequest("textDocument/hover", {
      textDocument: { uri: "file:///counter.mel" },
      position: { line: 6, character: 26 },
    })) as { contents: { kind: string; value: string } } | null;

    expect(result).not.toBeNull();
    expect(result!.contents.value).toContain("count");
    expect(result!.contents.value).toContain("state");
  });

  it("should return signature help inside function call", async () => {
    const result = (await sendRequest("textDocument/signatureHelp", {
      textDocument: { uri: "file:///counter.mel" },
      position: { line: 11, character: 25 },
    })) as {
      signatures: Array<{ label: string }>;
      activeParameter: number;
    } | null;

    expect(result).not.toBeNull();
    expect(result!.signatures).toHaveLength(1);
    expect(result!.signatures[0].label).toContain("add");
  });

  it("should return document symbols", async () => {
    const result = (await sendRequest("textDocument/documentSymbol", {
      textDocument: { uri: "file:///counter.mel" },
    })) as Array<{ name: string; kind: number; children?: unknown[] }>;

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);

    const domain = result[0];
    expect(domain.name).toBe("Counter");
    expect(domain.children).toBeDefined();
    expect(domain.children!.length).toBeGreaterThan(0);
  });

  // ============ Phase 2 E2E Tests ============

  it("should go to definition", async () => {
    // First restore counter.mel to valid state
    notifications.length = 0;
    sendNotification("textDocument/didChange", {
      textDocument: { uri: "file:///counter.mel", version: 3 },
      contentChanges: [{ text: COUNTER_MEL }],
    });
    await waitForNotification("textDocument/publishDiagnostics");

    // Go to definition of "count" in computed line
    // "  computed doubled = mul(count, 2)" — "count" starts at character 25
    const result = (await sendRequest("textDocument/definition", {
      textDocument: { uri: "file:///counter.mel" },
      position: { line: 6, character: 26 },
    })) as { uri: string; range: { start: { line: number } } } | null;

    expect(result).not.toBeNull();
    // Should point to state definition (line 2)
    expect(result!.range.start.line).toBe(2);
  });

  it("should find references", async () => {
    const result = (await sendRequest("textDocument/references", {
      textDocument: { uri: "file:///counter.mel" },
      position: { line: 2, character: 5 }, // "count" in state definition
      context: { includeDeclaration: true },
    })) as Array<{ uri: string; range: { start: { line: number } } }> | null;

    expect(result).not.toBeNull();
    // count is used in state def, computed, when gt, patch target, add(count)
    expect(result!.length).toBeGreaterThanOrEqual(3);
  });

  it("should prepare rename", async () => {
    const result = (await sendRequest("textDocument/prepareRename", {
      textDocument: { uri: "file:///counter.mel" },
      position: { line: 2, character: 5 }, // "count" in state
    })) as { range: object; placeholder: string } | null;

    expect(result).not.toBeNull();
    expect(result!.placeholder).toBe("count");
  });

  it("should rename symbol", async () => {
    const result = (await sendRequest("textDocument/rename", {
      textDocument: { uri: "file:///counter.mel" },
      position: { line: 2, character: 5 },
      newName: "counter",
    })) as { changes: Record<string, Array<{ range: object; newText: string }>> } | null;

    expect(result).not.toBeNull();
    const edits = result!.changes["file:///counter.mel"];
    expect(edits).toBeDefined();
    expect(edits.length).toBeGreaterThanOrEqual(3);
    for (const edit of edits) {
      expect(edit.newText).toBe("counter");
    }
  });

  it("should return semantic tokens", async () => {
    const result = (await sendRequest("textDocument/semanticTokens/full", {
      textDocument: { uri: "file:///counter.mel" },
    })) as { data: number[] };

    expect(result).toBeDefined();
    expect(result.data).toBeDefined();
    expect(result.data.length).toBeGreaterThan(0);
    // Semantic tokens data is encoded as [line, char, length, tokenType, tokenModifiers, ...]
    expect(result.data.length % 5).toBe(0);
  });

  it("should return code actions for unknown function", async () => {
    // Change to broken MEL with typo
    notifications.length = 0;
    sendNotification("textDocument/didChange", {
      textDocument: { uri: "file:///counter.mel", version: 4 },
      contentChanges: [
        {
          text: `domain Broken {
  state { count: number = 0 }
  computed bad = filtr(count)
}`,
        },
      ],
    });

    const diagParams = (await waitForNotification(
      "textDocument/publishDiagnostics"
    )) as { diagnostics: Array<{ severity: number; code: string; range: object; message: string }> };

    const unknownFnDiag = diagParams.diagnostics.find(
      (d) => d.code === "E_UNKNOWN_FN"
    );
    expect(unknownFnDiag).toBeDefined();

    const result = (await sendRequest("textDocument/codeAction", {
      textDocument: { uri: "file:///counter.mel" },
      range: unknownFnDiag!.range,
      context: { diagnostics: [unknownFnDiag!] },
    })) as Array<{ title: string }>;

    expect(result.length).toBeGreaterThan(0);
    expect(result.some((a) => a.title.includes("filter"))).toBe(true);
  });

  it("should update diagnostics on didChange", async () => {
    notifications.length = 0;

    sendNotification("textDocument/didChange", {
      textDocument: { uri: "file:///counter.mel", version: 2 },
      contentChanges: [{ text: BROKEN_MEL }],
    });

    const params = (await waitForNotification(
      "textDocument/publishDiagnostics"
    )) as { uri: string; diagnostics: Array<{ severity: number }> };

    expect(params.uri).toBe("file:///counter.mel");
    const errors = params.diagnostics.filter((d) => d.severity === 1);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("should clear diagnostics on didClose", async () => {
    notifications.length = 0;

    sendNotification("textDocument/didClose", {
      textDocument: { uri: "file:///broken.mel" },
    });

    const params = (await waitForNotification(
      "textDocument/publishDiagnostics"
    )) as { uri: string; diagnostics: unknown[] };

    expect(params.uri).toBe("file:///broken.mel");
    expect(params.diagnostics).toHaveLength(0);
  });
});
