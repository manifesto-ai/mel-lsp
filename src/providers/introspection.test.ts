import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { LspTestClient } from "../__tests__/lsp-client.js";

const TODO_MEL = `domain TodoApp {
  type Todo = { id: string, title: string, done: boolean }

  state {
    todos: Array<Todo> = []
    filter: "all" | "active" | "done" = "all"
  }

  computed totalCount = len(todos)
  computed doneCount = len(filter(todos, eq($item.done, true)))

  action addTodo(title: string) {
    onceIntent when neq(trim(title), "") {
      patch todos = append(todos, {
        id: $system.uuid,
        title: trim(title),
        done: false
      })
    }
  }

  action clearDone() available when gt(doneCount, 0) {
    onceIntent {
      patch todos = filter(todos, not($item.done))
    }
  }
}`;

describe("Phase 3: Schema Introspection", { timeout: 30_000 }, () => {
  let client: LspTestClient;

  beforeAll(async () => {
    client = new LspTestClient();
    await client.start();
    await client.openDocument("file:///todo.mel", TODO_MEL);
  });

  afterAll(() => client.close());

  it("mel/schemaIntrospection should return full schema", async () => {
    const result = (await client.sendRequest("mel/schemaIntrospection", {
      uri: "file:///todo.mel",
    })) as {
      domain: string | null;
      state: Record<string, { type: string }>;
      computed: string[];
      actions: Array<{ name: string; parameters: Array<{ name: string; type: string }>; available: boolean }>;
      types: string[];
    };

    expect(result).not.toBeNull();

    // State fields
    expect(result.state).toHaveProperty("todos");
    expect(result.state).toHaveProperty("filter");

    // Computed
    expect(result.computed).toContain("totalCount");
    expect(result.computed).toContain("doneCount");

    // Actions
    expect(result.actions.length).toBe(2);
    const addTodo = result.actions.find((a) => a.name === "addTodo");
    expect(addTodo).toBeDefined();
    expect(addTodo!.parameters.length).toBeGreaterThan(0);
    expect(addTodo!.parameters[0].name).toBe("title");

    const clearDone = result.actions.find((a) => a.name === "clearDone");
    expect(clearDone).toBeDefined();
    expect(clearDone!.available).toBe(true);

    // Types
    expect(result.types).toContain("Todo");
  });

  it("mel/actionSignatures should return action list", async () => {
    const result = (await client.sendRequest("mel/actionSignatures", {
      uri: "file:///todo.mel",
    })) as Array<{
      name: string;
      parameters: Array<{ name: string; type: string }>;
      available: boolean;
    }>;

    expect(result).not.toBeNull();
    expect(result.length).toBe(2);

    const names = result.map((a) => a.name);
    expect(names).toContain("addTodo");
    expect(names).toContain("clearDone");

    const addTodo = result.find((a) => a.name === "addTodo")!;
    expect(addTodo.parameters[0]).toEqual({ name: "title", type: "string" });
    expect(addTodo.available).toBe(false);

    const clearDone = result.find((a) => a.name === "clearDone")!;
    expect(clearDone.parameters).toHaveLength(0);
    expect(clearDone.available).toBe(true);
  });

  it("should return null for unknown document", async () => {
    const result = await client.sendRequest("mel/schemaIntrospection", {
      uri: "file:///nonexistent.mel",
    });
    expect(result).toBeNull();
  });
});
