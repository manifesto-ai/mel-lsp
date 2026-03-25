export const INTERMEDIATE_TODO_MEL = `\
domain TodoApp {
  type Todo = { id: string, title: string, done: boolean }

  state {
    todos: Array<Todo> = []
    filter: "all" | "active" | "done" = "all"
  }

  computed totalCount = len(todos)
  computed doneCount = len(filter(todos, eq($item.done, true)))
  computed activeCount = sub(totalCount, doneCount)
  computed hasDone = gt(doneCount, 0)

  action addTodo(title: string) {
    when eq(trim(title), "") {
      fail "EMPTY_TITLE"
    }
    onceIntent when neq(trim(title), "") {
      patch todos = append(todos, {
        id: $system.uuid,
        title: trim(title),
        done: false
      })
    }
  }

  action toggleTodo(id: string) {
    onceIntent {
      patch todos = map(todos,
        cond(eq($item.id, id),
          { id: $item.id, title: $item.title, done: not($item.done) },
          $item
        )
      )
    }
  }

  action removeTodo(id: string) {
    onceIntent {
      patch todos = filter(todos, neq($item.id, id))
    }
  }

  action clearDone() available when hasDone {
    onceIntent {
      patch todos = filter(todos, not($item.done))
    }
  }

  action setFilter(mode: "all" | "active" | "done") {
    onceIntent {
      patch filter = mode
    }
  }
}`;

export const INTERMEDIATE_TYPO_MEL = `\
domain TodoApp {
  type Todo = { id: string, title: string, done: boolean }

  state {
    todos: Array<Todo> = []
    filter: "all" | "active" | "done" = "all"
  }

  computed totalCount = len(todos)
  computed doneCount = len(filtr(todos, eq($item.done, true)))
  computed activeCount = sub(totalCount, doneCount)
  computed hasDone = gt(doneCount, 0)

  action addTodo(title: string) {
    when eq(trim(title), "") {
      fail "EMPTY_TITLE"
    }
    onceIntent when neq(trim(title), "") {
      patch todos = append(todos, {
        id: $system.uuid,
        title: trim(title),
        done: false
      })
    }
  }

  action toggleTodo(id: string) {
    onceIntent {
      patch todos = map(todos,
        cond(eq($item.id, id),
          { id: $item.id, title: $item.title, done: not($item.done) },
          $item
        )
      )
    }
  }

  action removeTodo(id: string) {
    onceIntent {
      patch todos = filter(todos, neq($item.id, id))
    }
  }

  action clearDone() available when hasDone {
    onceIntent {
      patch todos = filter(todos, not($item.done))
    }
  }

  action setFilter(mode: "all" | "active" | "done") {
    onceIntent {
      patch filter = mode
    }
  }
}`;
