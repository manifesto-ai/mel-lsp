/**
 * Advanced-level MEL fixture: ProjectManager
 *
 * A complex project management domain used in advanced E2E tests.
 */

export const ADVANCED_PROJECT_MEL = `\
domain ProjectManager {
  type Member = { id: string, name: string, role: "owner" | "editor" | "viewer" }
  type Task = { id: string, title: string, assignee: string | null, status: "todo" | "doing" | "done", priority: number }

  state {
    projectName: string = ""
    members: Array<Member> = []
    tasks: Array<Task> = []
    selectedTaskId: string | null = null
    fetchStep: string | null = null
    filterStep: string | null = null
    status: "idle" | "loading" | "ready" | "error" = "idle"
    lastError: string | null = null
  }

  computed memberCount = len(members)
  computed taskCount = len(tasks)
  computed todoTasks = filter(tasks, eq($item.status, "todo"))
  computed doingTasks = filter(tasks, eq($item.status, "doing"))
  computed doneTasks = filter(tasks, eq($item.status, "done"))
  computed todoCount = len(todoTasks)
  computed doingCount = len(doingTasks)
  computed doneCount = len(doneTasks)
  computed progress = cond(gt(taskCount, 0), concat(toString(doneCount), "/", toString(taskCount)), "0/0")
  computed selectedTask = cond(isNotNull(selectedTaskId), at(tasks, selectedTaskId), null)
  computed hasMembers = gt(memberCount, 0)
  computed isReady = eq(status, "ready")

  action initProject(name: string) {
    when eq(trim(name), "") {
      fail "EMPTY_NAME"
    }
    onceIntent when neq(trim(name), "") {
      patch projectName = trim(name)
      patch status = "ready"
    }
  }

  action addMember(id: string, name: string, role: "owner" | "editor" | "viewer") available when isReady {
    when eq(trim(name), "") {
      fail "EMPTY_NAME"
    }
    onceIntent when neq(trim(name), "") {
      patch members = append(members, {
        id: id,
        name: trim(name),
        role: role
      })
    }
  }

  action addTask(title: string, priority: number) available when isReady {
    when eq(trim(title), "") {
      fail "EMPTY_TITLE"
    }
    when or(lt(priority, 1), gt(priority, 5)) {
      fail "INVALID_PRIORITY"
    }
    onceIntent when and(neq(trim(title), ""), and(gte(priority, 1), lte(priority, 5))) {
      patch tasks = append(tasks, {
        id: $system.uuid,
        title: trim(title),
        assignee: null,
        status: "todo",
        priority: priority
      })
    }
  }

  action assignTask(taskId: string, memberId: string) available when isReady {
    onceIntent {
      patch tasks = map(tasks,
        cond(eq($item.id, taskId),
          { id: $item.id, title: $item.title, assignee: memberId, status: $item.status, priority: $item.priority },
          $item
        )
      )
    }
  }

  action moveTask(taskId: string, newStatus: "todo" | "doing" | "done") available when isReady {
    onceIntent {
      patch tasks = map(tasks,
        cond(eq($item.id, taskId),
          { id: $item.id, title: $item.title, assignee: $item.assignee, status: newStatus, priority: $item.priority },
          $item
        )
      )
    }
  }

  action selectTask(taskId: string | null) {
    onceIntent {
      patch selectedTaskId = taskId
    }
  }

  action fetchTasks() available when isReady {
    once(fetchStep) {
      patch fetchStep = $meta.intentId
      patch status = "loading"
      effect api.fetch({ url: concat("/projects/", projectName, "/tasks"), into: tasks })
    }
    when and(isNotNull(fetchStep), gt(len(tasks), 0)) {
      patch status = "ready"
    }
  }

  action removeCompletedTasks() available when and(isReady, gt(doneCount, 0)) {
    onceIntent {
      patch tasks = filter(tasks, neq($item.status, "done"))
    }
  }
}
`;

/**
 * Typo variant — uses "flter" instead of "filter" to trigger E_UNKNOWN_FN diagnostic.
 */
export const ADVANCED_TYPO_MEL = `\
domain ProjectManager {
  type Member = { id: string, name: string, role: "owner" | "editor" | "viewer" }
  type Task = { id: string, title: string, assignee: string | null, status: "todo" | "doing" | "done", priority: number }

  state {
    projectName: string = ""
    members: Array<Member> = []
    tasks: Array<Task> = []
    selectedTaskId: string | null = null
    fetchStep: string | null = null
    filterStep: string | null = null
    status: "idle" | "loading" | "ready" | "error" = "idle"
    lastError: string | null = null
  }

  computed memberCount = len(members)
  computed taskCount = len(tasks)
  computed todoTasks = flter(tasks, eq($item.status, "todo"))
  computed doingTasks = filter(tasks, eq($item.status, "doing"))
  computed doneTasks = filter(tasks, eq($item.status, "done"))
  computed todoCount = len(todoTasks)
  computed doingCount = len(doingTasks)
  computed doneCount = len(doneTasks)
  computed progress = cond(gt(taskCount, 0), concat(toString(doneCount), "/", toString(taskCount)), "0/0")
  computed selectedTask = cond(isNotNull(selectedTaskId), at(tasks, selectedTaskId), null)
  computed hasMembers = gt(memberCount, 0)
  computed isReady = eq(status, "ready")

  action initProject(name: string) {
    when eq(trim(name), "") {
      fail "EMPTY_NAME"
    }
    onceIntent when neq(trim(name), "") {
      patch projectName = trim(name)
      patch status = "ready"
    }
  }
}
`;

/**
 * Error variant — uses $system.uuid in a computed, which is forbidden (E001).
 */
export const ADVANCED_ERROR_MEL = `\
domain ProjectManager {
  state {
    tasks: Array<string> = []
  }

  computed badId = $system.uuid
}
`;
