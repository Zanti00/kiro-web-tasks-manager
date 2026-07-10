"use client";

import { useEffect, useState, useTransition } from "react";
import { toggleTask, updateTask, deleteTask } from "@/app/actions";

interface Task {
  id: string;
  title: string;
  is_complete: boolean;
  created_at: string;
}

export default function TaskList({ tasks: initialTasks }: { tasks: Task[] }) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [isPending, startTransition] = useTransition();

  // Sync local state when server-revalidated props change
  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  function handleToggle(id: string, currentValue: boolean) {
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, is_complete: !currentValue } : t))
    );

    startTransition(async () => {
      const result = await toggleTask(id, !currentValue);
      if (result?.error) {
        // Rollback on failure
        setTasks((prev) =>
          prev.map((t) =>
            t.id === id ? { ...t, is_complete: currentValue } : t
          )
        );
      }
    });
  }

  function handleDelete(id: string) {
    // Optimistic update
    const previousTasks = tasks;
    setTasks((prev) => prev.filter((t) => t.id !== id));

    startTransition(async () => {
      const result = await deleteTask(id);
      if (result?.error) {
        // Rollback on failure
        setTasks(previousTasks);
      }
    });
  }

  function startEditing(task: Task) {
    setEditingId(task.id);
    setEditTitle(task.title);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditTitle("");
  }

  function handleSaveEdit(id: string) {
    const trimmed = editTitle.trim();
    if (!trimmed) return;

    const previousTasks = tasks;
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, title: trimmed } : t))
    );
    setEditingId(null);

    startTransition(async () => {
      const result = await updateTask(id, trimmed);
      if (result?.error) {
        setTasks(previousTasks);
      }
    });
  }

  if (tasks.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
        No tasks yet. Add one above to get started.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
      {tasks.map((task) => (
        <li
          key={task.id}
          className="flex items-center gap-3 py-3 px-1 sm:px-2"
        >
          <input
            type="checkbox"
            checked={task.is_complete}
            onChange={() => handleToggle(task.id, task.is_complete)}
            aria-label={`Mark "${task.title}" as ${task.is_complete ? "incomplete" : "complete"}`}
            className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 dark:border-zinc-600"
          />

          {editingId === task.id ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveEdit(task.id);
              }}
              className="flex flex-1 gap-2"
            >
              <label htmlFor={`edit-task-${task.id}`} className="sr-only">
                Edit task title
              </label>
              <input
                id={`edit-task-${task.id}`}
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                autoFocus
                className="flex-1 rounded-md border border-zinc-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
              <button
                type="submit"
                disabled={isPending}
                className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                Save
              </button>
              <button
                type="button"
                onClick={cancelEditing}
                className="rounded px-2 py-1 text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400"
              >
                Cancel
              </button>
            </form>
          ) : (
            <>
              <span
                className={`flex-1 text-sm ${
                  task.is_complete
                    ? "text-zinc-400 line-through dark:text-zinc-500"
                    : "text-zinc-900 dark:text-zinc-100"
                }`}
              >
                {task.title}
              </span>
              <button
                onClick={() => startEditing(task)}
                aria-label={`Edit "${task.title}"`}
                className="rounded px-2 py-1 text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(task.id)}
                aria-label={`Delete "${task.title}"`}
                className="rounded px-2 py-1 text-xs font-medium text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              >
                Delete
              </button>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}
