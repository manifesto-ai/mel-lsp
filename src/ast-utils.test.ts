import { describe, it, expect } from "vitest";
import {
  analyzeDocument,
  findSymbolAtOffset,
  findDefinition,
  findAllReferences,
  findAllOccurrences,
} from "./ast-utils.js";

const SAMPLE_MEL = `domain Test {
  state {
    count: number = 0
    name: string = ""
  }

  computed doubled = mul(count, 2)

  action increment(amount: number) {
    when gt(count, 0) {
      patch count = add(count, amount)
    }
  }
}`;

describe("ast-utils", () => {
  it("should analyze valid MEL", () => {
    const result = analyzeDocument(SAMPLE_MEL);
    expect(result).not.toBeNull();
    expect(result!.definitions.length).toBeGreaterThan(0);
    expect(result!.references.length).toBeGreaterThan(0);
  });

  it("should return null for invalid MEL", () => {
    const result = analyzeDocument("not valid mel {{{");
    expect(result).toBeNull();
  });

  it("should collect state field definitions", () => {
    const result = analyzeDocument(SAMPLE_MEL)!;
    const countDef = result.definitions.find(
      (d) => d.name === "count" && d.symbolKind === "state"
    );
    expect(countDef).toBeDefined();
    expect(countDef!.kind).toBe("definition");
  });

  it("should collect computed definitions", () => {
    const result = analyzeDocument(SAMPLE_MEL)!;
    const def = result.definitions.find(
      (d) => d.name === "doubled" && d.symbolKind === "computed"
    );
    expect(def).toBeDefined();
  });

  it("should collect action definitions", () => {
    const result = analyzeDocument(SAMPLE_MEL)!;
    const def = result.definitions.find(
      (d) => d.name === "increment" && d.symbolKind === "action"
    );
    expect(def).toBeDefined();
  });

  it("should collect param definitions", () => {
    const result = analyzeDocument(SAMPLE_MEL)!;
    const def = result.definitions.find(
      (d) => d.name === "amount" && d.symbolKind === "param"
    );
    expect(def).toBeDefined();
  });

  it("should collect identifier references", () => {
    const result = analyzeDocument(SAMPLE_MEL)!;
    const countRefs = result.references.filter((r) => r.name === "count");
    // count is referenced in: computed doubled, when gt, patch target, add(count, amount)
    expect(countRefs.length).toBeGreaterThanOrEqual(3);
  });

  it("findSymbolAtOffset should find symbol", () => {
    const result = analyzeDocument(SAMPLE_MEL)!;
    // Find "count" in state definition
    const countDef = result.definitions.find(
      (d) => d.name === "count" && d.symbolKind === "state"
    )!;
    const found = findSymbolAtOffset(result, countDef.location.start.offset);
    expect(found).not.toBeNull();
    expect(found!.name).toBe("count");
  });

  it("findDefinition should return definition", () => {
    const result = analyzeDocument(SAMPLE_MEL)!;
    const def = findDefinition(result, "count", "state");
    expect(def).not.toBeNull();
    expect(def!.kind).toBe("definition");
    expect(def!.symbolKind).toBe("state");
  });

  it("findAllReferences should return references only", () => {
    const result = analyzeDocument(SAMPLE_MEL)!;
    const refs = findAllReferences(result, "count", "state");
    expect(refs.length).toBeGreaterThan(0);
    for (const ref of refs) {
      expect(ref.kind).toBe("reference");
    }
  });

  it("findAllOccurrences should return definition + references", () => {
    const result = analyzeDocument(SAMPLE_MEL)!;
    const all = findAllOccurrences(result, "count", "state");
    const defs = all.filter((o) => o.kind === "definition");
    const refs = all.filter((o) => o.kind === "reference");
    expect(defs.length).toBe(1);
    expect(refs.length).toBeGreaterThan(0);
  });
});
