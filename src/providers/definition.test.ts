import { describe, it, expect } from "vitest";
import { TextDocument } from "vscode-languageserver-textdocument";
import { handleDefinition } from "./definition.js";
import { MelDocumentManager } from "../document-manager.js";

function createDoc(content: string): TextDocument {
  return TextDocument.create("file:///test.mel", "mel", 1, content);
}

function mockDocs(doc: TextDocument) {
  return {
    get: (uri: string) => (uri === doc.uri ? doc : undefined),
  } as unknown as MelDocumentManager;
}

const MEL = `domain Test {
  state {
    count: number = 0
  }
  computed doubled = mul(count, 2)
  action inc() {
    when gt(count, 0) {
      patch count = add(count, 1)
    }
  }
}`;

describe("definition provider", () => {
  it("should jump from reference to definition", () => {
    const doc = createDoc(MEL);
    const handler = handleDefinition(mockDocs(doc));

    // "count" in computed line (line 4, after "mul(")
    // Find "count" reference position: "  computed doubled = mul(count, 2)"
    const text = doc.getText();
    const refOffset = text.indexOf("mul(count") + 4; // points to 'c' of 'count'
    const pos = doc.positionAt(refOffset);

    const result = handler({
      textDocument: { uri: doc.uri },
      position: pos,
    });

    expect(result).not.toBeNull();
    // Should point to state definition of count (line 2)
    expect(result!.range.start.line).toBe(2);
  });

  it("should return definition when already at definition", () => {
    const doc = createDoc(MEL);
    const handler = handleDefinition(mockDocs(doc));

    // "count" in state block (line 2)
    const text = doc.getText();
    const defOffset = text.indexOf("count: number");
    const pos = doc.positionAt(defOffset);

    const result = handler({
      textDocument: { uri: doc.uri },
      position: pos,
    });

    expect(result).not.toBeNull();
    expect(result!.range.start.line).toBe(2);
  });

  it("should return null for unknown position", () => {
    const doc = createDoc(MEL);
    const handler = handleDefinition(mockDocs(doc));

    const result = handler({
      textDocument: { uri: doc.uri },
      position: { line: 0, character: 0 },
    });

    // "domain" keyword — not a symbol, should return null
    expect(result).toBeNull();
  });
});
