import { describe, it, expect } from "vitest";
import { TextDocument } from "vscode-languageserver-textdocument";
import { DiagnosticSeverity } from "vscode-languageserver/node.js";
import { handleCodeAction } from "./code-actions.js";
import { MelDocumentManager } from "../document-manager.js";

function createDoc(content: string): TextDocument {
  return TextDocument.create("file:///test.mel", "mel", 1, content);
}

function mockDocs(doc: TextDocument) {
  return {
    get: (uri: string) => (uri === doc.uri ? doc : undefined),
  } as unknown as MelDocumentManager;
}

describe("code actions provider", () => {
  it('should suggest "filter" for "filtr"', () => {
    const doc = createDoc("computed x = filtr(items, eq($item, 1))");
    const handler = handleCodeAction(mockDocs(doc));

    const actions = handler({
      textDocument: { uri: doc.uri },
      range: { start: { line: 0, character: 13 }, end: { line: 0, character: 18 } },
      context: {
        diagnostics: [
          {
            range: {
              start: { line: 0, character: 13 },
              end: { line: 0, character: 18 },
            },
            severity: DiagnosticSeverity.Error,
            code: "E_UNKNOWN_FN",
            message: "Unknown function 'filtr'. Check spelling or see MEL builtin function reference",
            source: "mel",
          },
        ],
      },
    });

    expect(actions.length).toBeGreaterThan(0);
    const labels = actions.map((a) => a.title);
    expect(labels.some((l) => l.includes("filter"))).toBe(true);
  });

  it("should return empty for non-E_UNKNOWN_FN diagnostics", () => {
    const doc = createDoc("domain Test {}");
    const handler = handleCodeAction(mockDocs(doc));

    const actions = handler({
      textDocument: { uri: doc.uri },
      range: { start: { line: 0, character: 0 }, end: { line: 0, character: 5 } },
      context: {
        diagnostics: [
          {
            range: {
              start: { line: 0, character: 0 },
              end: { line: 0, character: 5 },
            },
            severity: DiagnosticSeverity.Error,
            code: "E_PARSE",
            message: "Parse error",
            source: "mel",
          },
        ],
      },
    });

    expect(actions).toHaveLength(0);
  });

  it('should suggest "concat" for "conct"', () => {
    const doc = createDoc('computed x = conct("a", "b")');
    const handler = handleCodeAction(mockDocs(doc));

    const actions = handler({
      textDocument: { uri: doc.uri },
      range: { start: { line: 0, character: 13 }, end: { line: 0, character: 18 } },
      context: {
        diagnostics: [
          {
            range: {
              start: { line: 0, character: 13 },
              end: { line: 0, character: 18 },
            },
            severity: DiagnosticSeverity.Error,
            code: "E_UNKNOWN_FN",
            message: "Unknown function 'conct'. Check spelling or see MEL builtin function reference",
            source: "mel",
          },
        ],
      },
    });

    expect(actions.length).toBeGreaterThan(0);
    expect(actions.some((a) => a.title.includes("concat"))).toBe(true);
  });
});
