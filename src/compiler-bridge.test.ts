import { describe, it, expect } from "vitest";
import { CompilerBridge } from "./compiler-bridge.js";

const VALID_MEL = `
domain Counter {
  state {
    count: number = 0
  }
  computed doubled = mul(count, 2)
  action increment() {
    when gt(count, 0) {
      patch count = add(count, 1)
    }
  }
}
`;

const INVALID_MEL = `
domain Broken {
  state {
    count: number = 0
  }
  computed bad = unknownFunc(count)
}
`;

const SYNTAX_ERROR_MEL = `
domain {
  state {
`;

describe("CompilerBridge", () => {
  it("should compile valid MEL with no diagnostics", () => {
    const bridge = new CompilerBridge();
    const diags = bridge.compile("file:///test.mel", VALID_MEL, 1);
    const errors = diags.filter((d) => d.severity === 1); // Error
    expect(errors).toHaveLength(0);
  });

  it("should compile valid MEL and cache schema", () => {
    const bridge = new CompilerBridge();
    bridge.compile("file:///test.mel", VALID_MEL, 1);
    const schema = bridge.getSchema("file:///test.mel");
    expect(schema).not.toBeNull();
    expect(schema!.state.fields).toHaveProperty("count");
  });

  it("should return diagnostics for unknown function", () => {
    const bridge = new CompilerBridge();
    const diags = bridge.compile("file:///test.mel", INVALID_MEL, 1);
    const errors = diags.filter((d) => d.severity === 1); // Error
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].code).toBeTruthy();
  });

  it("should preserve last-good schema on compilation failure", () => {
    const bridge = new CompilerBridge();

    // First: compile valid
    bridge.compile("file:///test.mel", VALID_MEL, 1);
    const schema1 = bridge.getSchema("file:///test.mel");
    expect(schema1).not.toBeNull();

    // Then: compile invalid
    bridge.compile("file:///test.mel", INVALID_MEL, 2);
    const schema2 = bridge.getSchema("file:///test.mel");

    // Should still have the old schema
    expect(schema2).not.toBeNull();
    expect(schema2!.state.fields).toHaveProperty("count");
  });

  it("should convert 1-based positions to 0-based", () => {
    const bridge = new CompilerBridge();
    const diags = bridge.compile("file:///test.mel", SYNTAX_ERROR_MEL, 1);

    // All diagnostics should have 0-based positions
    for (const diag of diags) {
      expect(diag.range.start.line).toBeGreaterThanOrEqual(0);
      expect(diag.range.start.character).toBeGreaterThanOrEqual(0);
      expect(diag.range.end.line).toBeGreaterThanOrEqual(0);
      expect(diag.range.end.character).toBeGreaterThanOrEqual(0);
    }
  });

  it("should track files independently", () => {
    const bridge = new CompilerBridge();
    bridge.compile("file:///a.mel", VALID_MEL, 1);
    bridge.compile("file:///b.mel", INVALID_MEL, 1);

    expect(bridge.getSchema("file:///a.mel")).not.toBeNull();
    // b.mel has no prior good schema, so it should be null
    expect(bridge.getSchema("file:///b.mel")).toBeNull();
  });

  it("should clear cache on remove", () => {
    const bridge = new CompilerBridge();
    bridge.compile("file:///test.mel", VALID_MEL, 1);
    expect(bridge.getSchema("file:///test.mel")).not.toBeNull();

    bridge.remove("file:///test.mel");
    expect(bridge.getSchema("file:///test.mel")).toBeNull();
  });

  it("should include source 'mel' in diagnostics", () => {
    const bridge = new CompilerBridge();
    const diags = bridge.compile("file:///test.mel", INVALID_MEL, 1);
    for (const diag of diags) {
      expect(diag.source).toBe("mel");
    }
  });
});
