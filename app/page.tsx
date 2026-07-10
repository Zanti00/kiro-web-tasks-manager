import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions";
import TaskList from "@/app/components/TaskList";
import AddTaskForm from "@/app/components/AddTaskForm";

export default async function Dashboard() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <nav className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 sm:text-xl">
            Task Manager
          </h1>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-zinc-500 dark:text-zinc-400 sm:inline">
              {user?.email}
            </span>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Sign out
              </button>
            </form>
          </div>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <section aria-label="Add new task" className="mb-6">
          <AddTaskForm />
        </section>

        <section aria-label="Task list">
          <TaskList tasks={tasks ?? []} />
        </section>
      </main>
    </div>
  );
}
