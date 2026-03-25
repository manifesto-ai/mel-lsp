import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { LspTestClient, type Diag } from "./lsp-client.js";
import {
  INTERMEDIATE_TODO_MEL,
  INTERMEDIATE_TYPO_MEL,
} from "./fixtures/intermediate-todo.mel.js";

const URI = "file:///intermediate-todo.mel";
const TYPO_URI = "file:///intermediate-typo.mel";

describe("E2E Intermediate: TodoApp", { timeout: 30_000 }, () => {
  let client: LspTestClient;

  beforeAll(async () => {
    client = new LspTestClient();
    await client.start();
  });

  afterAll(() => {
    client.close();
  });

  // ---- 1. Compile with no errors ----
  it("should compile with no errors", async () => {
    const { diagnostics } = await client.openDocument(URI, INTERMEDIATE_TODO_MEL);
    const errors = diagnostics.filter((d: Diag) => d.severity === 1);
    expect(errors).toHaveLength(0);
  });

  // ---- 2. Named type in completions ----
  it("should include named type in completions", async () => {
    // Position inside an expression context: line 8 (computed totalCount = len(todos))
    // Place cursor at char 27 which is inside the len() call — expression position
    const items = await client.completion(URI, 8, 27);
    const labels = items.map((c) => c.label);
    expect(labels).toContain("Todo");
  });

  // ---- 3. State fields in completions ----
  it("should include state fields in completions", async () => {
    // Same expression position — state fields should appear as completions
    const items = await client.completion(URI, 8, 27);
    const labels = items.map((c) => c.label);
    expect(labels).toContain("todos");
    expect(labels).toContain("filter");
  });

  // ---- 4. Hover action name ----
  it("should hover action name", async () => {
    // Line 13: `  action addTodo(title: string) {`
    // "addTodo" starts at character 9
    const result = await client.hover(URI, 13, 9);
    expect(result).not.toBeNull();
  });

  // ---- 5. Document symbols including types ----
  it("should return document symbols including types", async () => {
    const symbols = await client.documentSymbol(URI);
    expect(symbols.length).toBeGreaterThanOrEqual(1);

    // The top-level symbol should be the domain TodoApp
    const domain = symbols.find((s) => s.name === "TodoApp");
    expect(domain).toBeDefined();
    expect(domain!.children).toBeDefined();

    const childNames = domain!.children!.map((c) => c.name);

    // Type
    expect(childNames).toContain("Todo");

    // State block
    expect(childNames.some((n) => n.toLowerCase().includes("state"))).toBe(true);

    // Computed
    expect(childNames).toContain("totalCount");
    expect(childNames).toContain("doneCount");
    expect(childNames).toContain("activeCount");
    expect(childNames).toContain("hasDone");

    // All 5 actions (symbol names include params, e.g. "addTodo(title)")
    expect(childNames.some((n) => n.startsWith("addTodo"))).toBe(true);
    expect(childNames.some((n) => n.startsWith("toggleTodo"))).toBe(true);
    expect(childNames.some((n) => n.startsWith("removeTodo"))).toBe(true);
    expect(childNames.some((n) => n.startsWith("clearDone"))).toBe(true);
    expect(childNames.some((n) => n.startsWith("setFilter"))).toBe(true);
  });

  // ---- 6. Go to definition of state field from action body ----
  it("should go to definition of state field from action body", async () => {
    // Line 18: `      patch todos = append(todos, {`
    // "todos" after "patch " starts at char 12
    const loc = await client.definition(URI, 18, 12);
    expect(loc).not.toBeNull();
    // Definition should point to the state block (line 4: `    todos: Array<Todo> = []`)
    expect(loc!.range.start.line).toBe(4);
  });

  // ---- 7. Find references of todos across all actions ----
  it("should find references of todos across all actions", async () => {
    // "todos" is defined at line 4, char 4
    const refs = await client.references(URI, 4, 4, true);
    expect(refs).not.toBeNull();
    // definition + computed totalCount + computed doneCount + addTodo (patch + append)
    // + toggleTodo (patch + map) + removeTodo (patch + filter) + clearDone (patch + filter)
    expect(refs!.length).toBeGreaterThanOrEqual(7);
  });

  // ---- 8. Rename state field ----
  it("should rename state field", async () => {
    // Rename "todos" at its definition: line 4, char 4
    const result = await client.rename(URI, 4, 4, "items");
    expect(result).not.toBeNull();

    const edits = Object.values(result!.changes).flat();
    expect(edits.length).toBeGreaterThanOrEqual(7);
    for (const edit of edits) {
      expect(edit.newText).toBe("items");
    }
  });

  // ---- 9. Semantic tokens ----
  it("should return semantic tokens", async () => {
    const result = await client.semanticTokensFull(URI);
    expect(result).toBeDefined();
    expect(result.data).toBeDefined();
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data.length).toBeGreaterThan(0);
    // Semantic tokens data is encoded in groups of 5
    expect(result.data.length % 5).toBe(0);
  });

  // ---- 10. Fail diagnostic for broken MEL ----
  it("should show fail diagnostic for broken MEL", async () => {
    const { diagnostics } = await client.openDocument(
      TYPO_URI,
      INTERMEDIATE_TYPO_MEL
    );
    const unknownFn = diagnostics.find(
      (d: Diag) => d.code === "E_UNKNOWN_FN"
    );
    expect(unknownFn).toBeDefined();
  });

  // ---- 11. Code action suggests fix ----
  it("should suggest fix via code action", async () => {
    const { diagnostics } = await client.openDocument(
      TYPO_URI,
      INTERMEDIATE_TYPO_MEL
    );
    const unknownFn = diagnostics.filter(
      (d: Diag) => d.code === "E_UNKNOWN_FN"
    );
    expect(unknownFn.length).toBeGreaterThan(0);

    const actions = await client.codeAction(TYPO_URI, unknownFn);
    expect(actions.length).toBeGreaterThan(0);

    const titles = actions.map((a) => a.title.toLowerCase());
    const suggestsFilter = titles.some((t) => t.includes("filter"));
    expect(suggestsFilter).toBe(true);
  });
});
