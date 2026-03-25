import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { LspTestClient, type Diag } from "./lsp-client.js";
import {
  ADVANCED_PROJECT_MEL,
  ADVANCED_TYPO_MEL,
  ADVANCED_ERROR_MEL,
} from "./fixtures/advanced-project.mel.js";

const URI = "file:///advanced-project.mel";

describe("E2E Advanced: ProjectManager", { timeout: 30_000 }, () => {
  let client: LspTestClient;

  beforeAll(async () => {
    client = new LspTestClient();
    await client.start();
  });

  afterAll(() => {
    client.close();
  });

  it("should compile complex domain with no errors", async () => {
    const { diagnostics } = await client.openDocument(URI, ADVANCED_PROJECT_MEL);
    const errors = diagnostics.filter((d: Diag) => d.severity === 1);
    expect(errors).toHaveLength(0);
  });

  it("should have many document symbols", async () => {
    await client.openDocument(URI, ADVANCED_PROJECT_MEL);
    const symbols = await client.documentSymbol(URI);
    // Top-level symbol is the domain "ProjectManager"
    const domain = symbols.find((s) => s.name === "ProjectManager");
    expect(domain).toBeDefined();
    // Should have at least 15 children: 2 types + state + 12 computed + 8 actions
    expect(domain!.children!.length).toBeGreaterThanOrEqual(15);
  });

  it("should complete state fields and computed names", async () => {
    await client.openDocument(URI, ADVANCED_PROJECT_MEL);
    // Position inside len(tasks) on line 16, char 28 — pointing at "tasks"
    // Line 16: "  computed taskCount = len(tasks)"
    //           0         1         2
    //           0123456789012345678901234567890
    // "tasks" starts at char 28
    const items = await client.completion(URI, 16, 28);
    const labels = items.map((c) => c.label);
    expect(labels).toContain("tasks");
    expect(labels).toContain("members");
    expect(labels).toContain("projectName");
    expect(labels).toContain("todoTasks");
    expect(labels).toContain("doneCount");
  });

  it("should go to definition of tasks field", async () => {
    await client.openDocument(URI, ADVANCED_PROJECT_MEL);
    // "tasks" in computed todoTasks = filter(tasks, ...)
    // Line 17: "  computed todoTasks = filter(tasks, eq($item.status, "todo"))"
    //           0         1         2         3
    //           01234567890123456789012345678901234
    // "filter(" ends at char 30, "tasks" starts at char 30
    const loc = await client.definition(URI, 17, 30);
    expect(loc).not.toBeNull();
    // Should point to state definition of tasks (line 7)
    expect(loc!.range.start.line).toBe(7);
  });

  it("should find all references to tasks", async () => {
    await client.openDocument(URI, ADVANCED_PROJECT_MEL);
    // "tasks" state definition at line 7, char 4
    // Line 7: "    tasks: Array<Task> = []"
    const refs = await client.references(URI, 7, 4, true);
    expect(refs).not.toBeNull();
    // tasks is used in: state def + taskCount + todoTasks + doingTasks +
    // doneTasks + addTask + assignTask(x2) + moveTask(x2) + fetchTasks(x3) +
    // removeCompletedTasks = many occurrences
    expect(refs!.length).toBeGreaterThanOrEqual(10);
  });

  it("should rename tasks to taskList", async () => {
    await client.openDocument(URI, ADVANCED_PROJECT_MEL);
    // Rename "tasks" from state definition at line 7, char 4
    const result = await client.rename(URI, 7, 4, "taskList");
    expect(result).not.toBeNull();
    const edits = result!.changes[URI];
    expect(edits).toBeDefined();
    expect(edits.length).toBeGreaterThanOrEqual(10);
    for (const edit of edits) {
      expect(edit.newText).toBe("taskList");
    }
  });

  it("should return rich semantic tokens", async () => {
    await client.openDocument(URI, ADVANCED_PROJECT_MEL);
    const tokens = await client.semanticTokensFull(URI);
    expect(tokens).toBeDefined();
    expect(tokens.data.length).toBeGreaterThan(50);
    // Semantic token data is always groups of 5 integers
    expect(tokens.data.length % 5).toBe(0);
  });

  it("should show signature help for nested functions", async () => {
    await client.openDocument(URI, ADVANCED_PROJECT_MEL);
    // Line 23: "  computed progress = cond(gt(taskCount, 0), concat(toString(doneCount), "/", toString(taskCount)), "0/0")"
    //           0         1         2         3         4         5
    //           0123456789012345678901234567890123456789012345678901234567
    // "concat(" — c is at char 46, ( is at char 52, first arg starts at char 53
    const sigHelp = await client.signatureHelp(URI, 23, 53);
    expect(sigHelp).not.toBeNull();
    const sigLabel = sigHelp!.signatures[0].label;
    expect(sigLabel).toContain("concat");
  });

  it("should hover system identifier", async () => {
    await client.openDocument(URI, ADVANCED_PROJECT_MEL);
    // Line 60: "        id: $system.uuid,"
    //           0         1
    //           0123456789012345
    // "$system" starts at char 12
    const result = await client.hover(URI, 60, 12);
    expect(result).not.toBeNull();
    expect(result!.contents.value).toContain("$system");
  });

  it("should detect $system in computed as error", async () => {
    const errorUri = "file:///advanced-error.mel";
    const { diagnostics } = await client.openDocument(errorUri, ADVANCED_ERROR_MEL);
    const errors = diagnostics.filter((d: Diag) => d.severity === 1);
    expect(errors.length).toBeGreaterThanOrEqual(1);
    const e001 = errors.find((d: Diag) => d.code === "E001");
    expect(e001).toBeDefined();
  });

  it("should suggest fix for function typo", async () => {
    const typoUri = "file:///advanced-typo.mel";
    const { diagnostics } = await client.openDocument(typoUri, ADVANCED_TYPO_MEL);
    // Find the E_UNKNOWN_FN diagnostic for "flter"
    const unknownFn = diagnostics.find(
      (d: Diag) => d.code === "E_UNKNOWN_FN"
    );
    expect(unknownFn).toBeDefined();
    const actions = await client.codeAction(typoUri, [unknownFn!]);
    expect(actions.length).toBeGreaterThanOrEqual(1);
    const filterFix = actions.find((a) => a.title.includes("filter"));
    expect(filterFix).toBeDefined();
  });
});
