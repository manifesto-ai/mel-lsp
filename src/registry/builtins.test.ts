import { describe, it, expect } from "vitest";
import {
  BUILTIN_FUNCTIONS,
  getBuiltinFunction,
  getAllBuiltinFunctions,
} from "./builtins.js";

describe("builtins registry", () => {
  it("should have 50+ functions", () => {
    expect(getAllBuiltinFunctions().length).toBeGreaterThanOrEqual(50);
  });

  it("every function has required fields", () => {
    for (const fn of getAllBuiltinFunctions()) {
      expect(fn.name).toBeTruthy();
      expect(fn.category).toBeTruthy();
      expect(fn.signature).toBeTruthy();
      expect(fn.parameters.length).toBeGreaterThanOrEqual(0);
      expect(fn.returnType).toBeTruthy();
      expect(fn.description).toBeTruthy();
      expect(fn.example).toBeTruthy();
      expect(fn.snippet).toBeTruthy();
      expect(fn.minArgs).toBeGreaterThanOrEqual(0);
    }
  });

  it("alias lookup works", () => {
    // toLowerCase -> lower
    expect(getBuiltinFunction("toLowerCase")).toBeDefined();
    expect(getBuiltinFunction("toLowerCase")!.name).toBe("toLowerCase");

    // toUpperCase -> upper
    expect(getBuiltinFunction("toUpperCase")).toBeDefined();

    // strLen -> strlen
    expect(getBuiltinFunction("strLen")).toBeDefined();

    // length -> len
    expect(getBuiltinFunction("length")).toBeDefined();

    // substr -> substring
    expect(getBuiltinFunction("substr")).toBeDefined();
  });

  it("covers all arithmetic functions", () => {
    const arith = [
      "add", "sub", "mul", "div", "mod", "neg", "abs",
      "floor", "ceil", "round", "sqrt", "pow", "min", "max",
    ];
    for (const name of arith) {
      expect(getBuiltinFunction(name)).toBeDefined();
    }
  });

  it("covers all comparison functions", () => {
    for (const name of ["eq", "neq", "gt", "gte", "lt", "lte"]) {
      expect(getBuiltinFunction(name)).toBeDefined();
    }
  });

  it("covers all logic functions", () => {
    for (const name of ["and", "or", "not", "cond", "if"]) {
      expect(getBuiltinFunction(name)).toBeDefined();
    }
  });

  it("covers all string functions", () => {
    const strings = [
      "concat", "trim", "lower", "upper", "strlen",
      "substring", "toString", "startsWith", "endsWith",
      "strIncludes", "indexOf", "replace", "split",
    ];
    for (const name of strings) {
      expect(getBuiltinFunction(name)).toBeDefined();
    }
  });

  it("covers all array functions", () => {
    const arrays = [
      "len", "at", "first", "last", "slice", "append",
      "includes", "filter", "map", "find", "every", "some",
      "reverse", "unique", "flat",
    ];
    for (const name of arrays) {
      expect(getBuiltinFunction(name)).toBeDefined();
    }
  });

  it("covers all object functions", () => {
    const objects = [
      "keys", "values", "entries", "merge", "field",
      "hasKey", "pick", "omit", "fromEntries",
    ];
    for (const name of objects) {
      expect(getBuiltinFunction(name)).toBeDefined();
    }
  });

  it("arity constraints match expected values", () => {
    // Unary
    expect(getBuiltinFunction("not")!.minArgs).toBe(1);
    expect(getBuiltinFunction("not")!.maxArgs).toBe(1);

    // Binary
    expect(getBuiltinFunction("add")!.minArgs).toBe(2);
    expect(getBuiltinFunction("add")!.maxArgs).toBe(2);

    // 2-3 args
    expect(getBuiltinFunction("slice")!.minArgs).toBe(2);
    expect(getBuiltinFunction("slice")!.maxArgs).toBe(3);

    // Variadic
    expect(getBuiltinFunction("concat")!.minArgs).toBe(1);
    expect(getBuiltinFunction("concat")!.maxArgs).toBeNull();

    // Conditional (3 args exactly)
    expect(getBuiltinFunction("cond")!.minArgs).toBe(3);
    expect(getBuiltinFunction("cond")!.maxArgs).toBe(3);
  });

  it("covers all entity primitive functions", () => {
    const entityPrimitives = ["findById", "existsById", "updateById", "removeById"];
    for (const name of entityPrimitives) {
      const fn = getBuiltinFunction(name);
      expect(fn).toBeDefined();
      expect(fn!.category).toBe("array");
    }
  });

  it("entity primitive arity constraints are correct", () => {
    expect(getBuiltinFunction("findById")!.minArgs).toBe(2);
    expect(getBuiltinFunction("findById")!.maxArgs).toBe(2);

    expect(getBuiltinFunction("existsById")!.minArgs).toBe(2);
    expect(getBuiltinFunction("existsById")!.maxArgs).toBe(2);

    expect(getBuiltinFunction("updateById")!.minArgs).toBe(3);
    expect(getBuiltinFunction("updateById")!.maxArgs).toBe(3);

    expect(getBuiltinFunction("removeById")!.minArgs).toBe(2);
    expect(getBuiltinFunction("removeById")!.maxArgs).toBe(2);
  });

  it("unknown function returns undefined", () => {
    expect(getBuiltinFunction("nonexistent")).toBeUndefined();
  });

  it("total map includes aliases", () => {
    // The map should have more entries than the canonical list
    expect(BUILTIN_FUNCTIONS.size).toBeGreaterThan(
      getAllBuiltinFunctions().length
    );
  });
});
