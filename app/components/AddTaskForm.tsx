"use client";

import { useRef, useState, useTransition } from "react";
import { createTask } from "@/app/actions";

export default function AddTaskForm() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    const title = (formData.get("title") as string)?.trim();
    if (!title) {
      setError("Title cannot be empty.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await createTask(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        formRef.current?.reset();
      }
    });
  }

  return (
    <form ref={formRef} action={handleSubmit} className="flex gap-2">
      <label htmlFor="new-task-title" className="sr-only">
        New task title
      </label>
      <input
        id="new-task-title"
        name="title"
        type="text"
        placeholder="Add a new task..."
        required
        className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
      />
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Adding..." : "Add"}
      </button>
      {error && (
        <p role="alert" className="self-center text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </form>
  );
}
