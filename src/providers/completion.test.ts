import { describe, it, expect } from "vitest";
import { TextDocument } from "vscode-languageserver-textdocument";
import { CompletionItemKind } from "vscode-languageserver/node.js";
import { handleCompletion } from "./completion.js";
import { CompilerBridge } from "../compiler-bridge.js";
import { MelDocumentManager } from "../document-manager.js";

function createDoc(content: string): TextDocument {
  return TextDocument.create("file:///test.mel", "mel", 1, content);
}

function mockDocs(doc: TextDocument) {
  return {
    get: (uri: string) => (uri === doc.uri ? doc : undefined),
  } as unknown as MelDocumentManager;
}

describe("completion provider", () => {
  it("should return builtin functions in expression context", () => {
    const doc = createDoc("computed x = ");
    const bridge = new CompilerBridge();
    const handler = handleCompletion(mockDocs(doc), bridge);

    const items = handler({
      textDocument: { uri: doc.uri },
      position: { line: 0, character: 13 },
    });

    const functionItems = items.filter(
      (i) => i.kind === CompletionItemKind.Function
    );
    expect(functionItems.length).toBeGreaterThan(10);

    const addItem = functionItems.find((i) => i.label === "add");
    expect(addItem).toBeDefined();
    expect(addItem?.detail).toContain("number");
  });

  it("should return system identifiers after $", () => {
    const doc = createDoc("patch x = $");
    const bridge = new CompilerBridge();
    const handler = handleCompletion(mockDocs(doc), bridge);

    const items = handler({
      textDocument: { uri: doc.uri },
      position: { line: 0, character: 11 },
    });

    const labels = items.map((i) => i.label);
    expect(labels).toContain("$system.uuid");
    expect(labels).toContain("$meta.intentId");
    expect(labels).toContain("$item");
  });

  it("should return structural keywords at top level", () => {
    const doc = createDoc("domain Test {\n  \n}");
    const bridge = new CompilerBridge();
    const handler = handleCompletion(mockDocs(doc), bridge);

    const items = handler({
      textDocument: { uri: doc.uri },
      position: { line: 1, character: 2 },
    });

    const keywordItems = items.filter(
      (i) => i.kind === CompletionItemKind.Keyword
    );
    const labels = keywordItems.map((i) => i.label);
    expect(labels).toContain("state");
    expect(labels).toContain("computed");
    expect(labels).toContain("action");
    expect(labels).toContain("type");
  });

  it("should return domain symbols from cached schema", () => {
    const mel = `domain Test {
  state {
    count: number = 0
    name: string = ""
  }
  computed doubled = mul(count, 2)
  action inc() {
    when gt(count, 0) {
      patch count = add(count, 1)
    }
  }
}`;
    const doc = createDoc(mel);
    const bridge = new CompilerBridge();
    bridge.compile(doc.uri, mel, 1);
    const handler = handleCompletion(mockDocs(doc), bridge);

    // In expression context: should include domain symbols
    const items = handler({
      textDocument: { uri: doc.uri },
      position: { line: 5, character: 30 }, // after "mul("
    });

    const fieldItems = items.filter(
      (i) => i.kind === CompletionItemKind.Field
    );
    const fieldLabels = fieldItems.map((i) => i.label);
    expect(fieldLabels).toContain("count");
    expect(fieldLabels).toContain("name");
  });

  it("should return effect types after 'effect '", () => {
    const mel = `domain Test {
  state { x: number = 0 }
  action foo() {
    when gt(x, 0) {
      effect `;
    const doc = createDoc(mel);
    const bridge = new CompilerBridge();
    const handler = handleCompletion(mockDocs(doc), bridge);

    const items = handler({
      textDocument: { uri: doc.uri },
      position: { line: 4, character: 13 },
    });

    const effectItems = items.filter(
      (i) => i.kind === CompletionItemKind.EnumMember
    );
    const labels = effectItems.map((i) => i.label);
    expect(labels).toContain("array.filter");
    expect(labels).toContain("api.fetch");
  });

  it("should return empty for unknown document", () => {
    const doc = createDoc("computed x = 1");
    const bridge = new CompilerBridge();
    const handler = handleCompletion(mockDocs(doc), bridge);

    const items = handler({
      textDocument: { uri: "file:///unknown.mel" },
      position: { line: 0, character: 0 },
    });

    expect(items).toHaveLength(0);
  });
});
