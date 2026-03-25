import { describe, it, expect } from "vitest";
import { TextDocument } from "vscode-languageserver-textdocument";
import { handleHover } from "./hover.js";
import { CompilerBridge } from "../compiler-bridge.js";
import { MelDocumentManager } from "../document-manager.js";

function createDoc(content: string): TextDocument {
  return TextDocument.create("file:///test.mel", "mel", 1, content);
}

// Minimal mock for MelDocumentManager
function mockDocs(doc: TextDocument) {
  return {
    get: (uri: string) => (uri === doc.uri ? doc : undefined),
    getText: (uri: string) => (uri === doc.uri ? doc.getText() : undefined),
    onDidChangeContent: () => ({ dispose: () => {} }),
    onDidClose: () => ({ dispose: () => {} }),
    listen: () => {},
  } as unknown as MelDocumentManager;
}

describe("hover provider", () => {
  it("should return hover for builtin function", () => {
    const doc = createDoc("computed x = add(1, 2)");
    const bridge = new CompilerBridge();
    const handler = handleHover(mockDocs(doc), bridge);

    // Hover over "add" (line 0, character 13-16)
    const result = handler({
      textDocument: { uri: doc.uri },
      position: { line: 0, character: 14 },
    });

    expect(result).not.toBeNull();
    expect(result!.contents).toBeDefined();
    const content = (result!.contents as { kind: string; value: string }).value;
    expect(content).toContain("add");
    expect(content).toContain("number");
  });

  it("should return hover for system identifier", () => {
    const doc = createDoc("patch x = $system.uuid");
    const bridge = new CompilerBridge();
    const handler = handleHover(mockDocs(doc), bridge);

    const result = handler({
      textDocument: { uri: doc.uri },
      position: { line: 0, character: 15 },
    });

    expect(result).not.toBeNull();
    const content = (result!.contents as { kind: string; value: string }).value;
    expect(content).toContain("$system.uuid");
  });

  it("should return hover for keyword", () => {
    const doc = createDoc("domain Test { }");
    const bridge = new CompilerBridge();
    const handler = handleHover(mockDocs(doc), bridge);

    const result = handler({
      textDocument: { uri: doc.uri },
      position: { line: 0, character: 3 },
    });

    expect(result).not.toBeNull();
    const content = (result!.contents as { kind: string; value: string }).value;
    expect(content).toContain("domain");
  });

  it("should return null for whitespace", () => {
    const doc = createDoc("  ");
    const bridge = new CompilerBridge();
    const handler = handleHover(mockDocs(doc), bridge);

    const result = handler({
      textDocument: { uri: doc.uri },
      position: { line: 0, character: 1 },
    });

    expect(result).toBeNull();
  });

  it("should return hover for state field from schema", () => {
    const mel = `domain Test {
  state {
    count: number = 0
  }
  computed x = count
}`;
    const doc = createDoc(mel);
    const bridge = new CompilerBridge();
    bridge.compile(doc.uri, mel, 1);
    const handler = handleHover(mockDocs(doc), bridge);

    // Hover over "count" in computed line
    const result = handler({
      textDocument: { uri: doc.uri },
      position: { line: 4, character: 17 },
    });

    expect(result).not.toBeNull();
    const content = (result!.contents as { kind: string; value: string }).value;
    expect(content).toContain("state");
    expect(content).toContain("count");
  });
});
