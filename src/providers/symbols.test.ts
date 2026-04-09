import { describe, it, expect } from "vitest";
import { TextDocument } from "vscode-languageserver-textdocument";
import { SymbolKind } from "vscode-languageserver/node.js";
import { handleDocumentSymbol } from "./symbols.js";
import { MelDocumentManager } from "../document-manager.js";

function createDoc(content: string): TextDocument {
  return TextDocument.create("file:///test.mel", "mel", 1, content);
}

function mockDocs(doc: TextDocument) {
  return {
    get: (uri: string) => (uri === doc.uri ? doc : undefined),
  } as unknown as MelDocumentManager;
}

describe("document symbols provider", () => {
  it("should return domain hierarchy for valid MEL", () => {
    const mel = `domain Counter {
  type Task = { id: string, done: boolean }

  state {
    count: number = 0
    name: string = ""
  }

  computed doubled = mul(count, 2)

  action increment() {
    when gt(count, 0) {
      patch count = add(count, 1)
    }
  }
}`;
    const doc = createDoc(mel);
    const handler = handleDocumentSymbol(mockDocs(doc));

    const result = handler({ textDocument: { uri: doc.uri } });

    expect(result).toHaveLength(1);

    const domain = result[0];
    expect(domain.name).toBe("Counter");
    expect(domain.kind).toBe(SymbolKind.Namespace);
    expect(domain.children).toBeDefined();

    const children = domain.children!;
    const names = children.map((c) => c.name);

    // Type
    expect(names).toContain("Task");
    const typeSymbol = children.find((c) => c.name === "Task");
    expect(typeSymbol?.kind).toBe(SymbolKind.Struct);

    // State
    const stateSymbol = children.find((c) => c.name === "state");
    expect(stateSymbol).toBeDefined();
    expect(stateSymbol?.kind).toBe(SymbolKind.Struct);
    expect(stateSymbol?.children).toHaveLength(2);
    expect(stateSymbol?.children?.[0].name).toBe("count");
    expect(stateSymbol?.children?.[0].kind).toBe(SymbolKind.Field);

    // Computed
    expect(names).toContain("doubled");
    const computedSymbol = children.find((c) => c.name === "doubled");
    expect(computedSymbol?.kind).toBe(SymbolKind.Property);

    // Action
    const actionSymbol = children.find((c) => c.name === "increment()");
    expect(actionSymbol).toBeDefined();
    expect(actionSymbol?.kind).toBe(SymbolKind.Function);
  });

  it("should return empty for unparseable MEL", () => {
    const doc = createDoc("this is not mel at all {{{");
    const handler = handleDocumentSymbol(mockDocs(doc));

    const result = handler({ textDocument: { uri: doc.uri } });
    expect(result).toHaveLength(0);
  });

  it("should return empty for missing document", () => {
    const doc = createDoc("domain X {}");
    const handler = handleDocumentSymbol(mockDocs(doc));

    const result = handler({ textDocument: { uri: "file:///other.mel" } });
    expect(result).toHaveLength(0);
  });

  it("should include flow declarations in outline", () => {
    const mel = `domain Test {
  state { x: number = 0 }

  flow validate(value: number) {
    when gt(value, 0) {
      patch x = value
    }
  }

  action submit(amount: number) {
    include validate(amount)
    onceIntent {
      patch x = amount
    }
  }
}`;
    const doc = createDoc(mel);
    const handler = handleDocumentSymbol(mockDocs(doc));

    const result = handler({ textDocument: { uri: doc.uri } });
    const domain = result[0];
    const flowSymbol = domain.children?.find(
      (c) => c.kind === SymbolKind.Function && c.name.startsWith("validate")
    );
    expect(flowSymbol).toBeDefined();
    expect(flowSymbol?.name).toBe("validate(value)");
  });

  it("should include action parameters in name", () => {
    const mel = `domain Test {
  state { x: number = 0 }
  action setX(value: number) {
    when gt(value, 0) {
      patch x = value
    }
  }
}`;
    const doc = createDoc(mel);
    const handler = handleDocumentSymbol(mockDocs(doc));

    const result = handler({ textDocument: { uri: doc.uri } });
    const domain = result[0];
    const actionSymbol = domain.children?.find(
      (c) => c.kind === SymbolKind.Function
    );
    expect(actionSymbol?.name).toBe("setX(value)");
  });
});
