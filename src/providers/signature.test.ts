import { describe, it, expect } from "vitest";
import { TextDocument } from "vscode-languageserver-textdocument";
import { handleSignatureHelp } from "./signature.js";
import { MelDocumentManager } from "../document-manager.js";

function createDoc(content: string): TextDocument {
  return TextDocument.create("file:///test.mel", "mel", 1, content);
}

function mockDocs(doc: TextDocument) {
  return {
    get: (uri: string) => (uri === doc.uri ? doc : undefined),
  } as unknown as MelDocumentManager;
}

describe("signature help provider", () => {
  it("should return signature for add(|)", () => {
    const doc = createDoc("computed x = add(");
    const handler = handleSignatureHelp(mockDocs(doc));

    const result = handler({
      textDocument: { uri: doc.uri },
      position: { line: 0, character: 17 },
      context: undefined as never,
    });

    expect(result).not.toBeNull();
    expect(result!.signatures).toHaveLength(1);
    expect(result!.signatures[0].label).toContain("add");
    expect(result!.activeParameter).toBe(0);
  });

  it("should return active parameter 1 for add(1, |)", () => {
    const doc = createDoc("computed x = add(1, ");
    const handler = handleSignatureHelp(mockDocs(doc));

    const result = handler({
      textDocument: { uri: doc.uri },
      position: { line: 0, character: 20 },
      context: undefined as never,
    });

    expect(result).not.toBeNull();
    expect(result!.activeParameter).toBe(1);
  });

  it("should handle nested calls: add(mul(|), 2)", () => {
    const doc = createDoc("computed x = add(mul(");
    const handler = handleSignatureHelp(mockDocs(doc));

    const result = handler({
      textDocument: { uri: doc.uri },
      position: { line: 0, character: 21 },
      context: undefined as never,
    });

    expect(result).not.toBeNull();
    expect(result!.signatures[0].label).toContain("mul");
    expect(result!.activeParameter).toBe(0);
  });

  it("should return null for unknown function", () => {
    const doc = createDoc("computed x = unknownFunc(");
    const handler = handleSignatureHelp(mockDocs(doc));

    const result = handler({
      textDocument: { uri: doc.uri },
      position: { line: 0, character: 24 },
      context: undefined as never,
    });

    expect(result).toBeNull();
  });

  it("should return null outside function call", () => {
    const doc = createDoc("computed x = 42");
    const handler = handleSignatureHelp(mockDocs(doc));

    const result = handler({
      textDocument: { uri: doc.uri },
      position: { line: 0, character: 15 },
      context: undefined as never,
    });

    expect(result).toBeNull();
  });

  it("should handle variadic functions correctly", () => {
    const doc = createDoc("computed x = concat(a, b, ");
    const handler = handleSignatureHelp(mockDocs(doc));

    const result = handler({
      textDocument: { uri: doc.uri },
      position: { line: 0, character: 26 },
      context: undefined as never,
    });

    expect(result).not.toBeNull();
    expect(result!.signatures[0].label).toContain("concat");
    // Variadic: activeParameter is clamped to max param index
    expect(result!.activeParameter).toBeDefined();
  });
});
