import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TaskList from "@/app/components/TaskList";

// Mock the server actions module
const mockToggleTask = vi.fn();
const mockUpdateTask = vi.fn();
const mockDeleteTask = vi.fn();

vi.mock("@/app/actions", () => ({
  toggleTask: (...args: unknown[]) => mockToggleTask(...args),
  updateTask: (...args: unknown[]) => mockUpdateTask(...args),
  deleteTask: (...args: unknown[]) => mockDeleteTask(...args),
}));

function createTask(overrides: Partial<{ id: string; title: string; is_complete: boolean; created_at: string }> = {}) {
  return {
    id: overrides.id ?? "task-1",
    title: overrides.title ?? "Test Task",
    is_complete: overrides.is_complete ?? false,
    created_at: overrides.created_at ?? "2024-01-01T00:00:00Z",
  };
}

describe("TaskList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockToggleTask.mockResolvedValue({ error: null });
    mockUpdateTask.mockResolvedValue({ error: null });
    mockDeleteTask.mockResolvedValue({ error: null });
  });

  describe("Rendering", () => {
    it("renders empty state message when tasks array is empty", () => {
      render(<TaskList tasks={[]} />);
      expect(
        screen.getByText("No tasks yet. Add one above to get started.")
      ).toBeInTheDocument();
    });

    it("renders all tasks with their titles", () => {
      const tasks = [
        createTask({ id: "1", title: "First task" }),
        createTask({ id: "2", title: "Second task" }),
        createTask({ id: "3", title: "Third task" }),
      ];
      render(<TaskList tasks={tasks} />);

      expect(screen.getByText("First task")).toBeInTheDocument();
      expect(screen.getByText("Second task")).toBeInTheDocument();
      expect(screen.getByText("Third task")).toBeInTheDocument();
    });

    it("shows completed tasks with line-through styling", () => {
      const tasks = [createTask({ id: "1", title: "Done task", is_complete: true })];
      render(<TaskList tasks={tasks} />);

      const taskTitle = screen.getByText("Done task");
      expect(taskTitle).toHaveClass("line-through");
    });

    it("does not apply line-through styling to incomplete tasks", () => {
      const tasks = [createTask({ id: "1", title: "Active task", is_complete: false })];
      render(<TaskList tasks={tasks} />);

      const taskTitle = screen.getByText("Active task");
      expect(taskTitle).not.toHaveClass("line-through");
    });

    it("renders Edit and Delete buttons for each task", () => {
      const tasks = [
        createTask({ id: "1", title: "Task One" }),
        createTask({ id: "2", title: "Task Two" }),
      ];
      render(<TaskList tasks={tasks} />);

      expect(screen.getByRole("button", { name: 'Edit "Task One"' })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: 'Delete "Task One"' })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: 'Edit "Task Two"' })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: 'Delete "Task Two"' })).toBeInTheDocument();
    });

    it("renders checkboxes with correct aria-labels", () => {
      const tasks = [
        createTask({ id: "1", title: "Incomplete", is_complete: false }),
        createTask({ id: "2", title: "Complete", is_complete: true }),
      ];
      render(<TaskList tasks={tasks} />);

      expect(
        screen.getByRole("checkbox", { name: 'Mark "Incomplete" as complete' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("checkbox", { name: 'Mark "Complete" as incomplete' })
      ).toBeInTheDocument();
    });
  });

  describe("Toggle interaction", () => {
    it("optimistically toggles task completion when checkbox is clicked", async () => {
      const user = userEvent.setup();
      const tasks = [createTask({ id: "1", title: "My Task", is_complete: false })];
      // Make toggleTask resolve but after a delay to observe the optimistic state
      mockToggleTask.mockResolvedValue({ error: null });

      render(<TaskList tasks={tasks} />);

      const checkbox = screen.getByRole("checkbox", { name: 'Mark "My Task" as complete' });
      expect(checkbox).not.toBeChecked();

      await user.click(checkbox);

      // Optimistic: checkbox should now be checked
      await waitFor(() => {
        expect(checkbox).toBeChecked();
      });

      // Verify toggleTask was called with correct arguments
      expect(mockToggleTask).toHaveBeenCalledWith("1", true);
    });

    it("rolls back toggle on server error", async () => {
      const user = userEvent.setup();
      const tasks = [createTask({ id: "1", title: "My Task", is_complete: false })];
      mockToggleTask.mockResolvedValue({ error: "Server error" });

      render(<TaskList tasks={tasks} />);

      const checkbox = screen.getByRole("checkbox", { name: 'Mark "My Task" as complete' });
      await user.click(checkbox);

      // After error, it should roll back to unchecked
      await waitFor(() => {
        expect(checkbox).not.toBeChecked();
      });
    });

    it("correctly toggles a completed task back to incomplete", async () => {
      const user = userEvent.setup();
      const tasks = [createTask({ id: "1", title: "Done Task", is_complete: true })];
      mockToggleTask.mockResolvedValue({ error: null });

      render(<TaskList tasks={tasks} />);

      const checkbox = screen.getByRole("checkbox", { name: 'Mark "Done Task" as incomplete' });
      expect(checkbox).toBeChecked();

      await user.click(checkbox);

      await waitFor(() => {
        expect(checkbox).not.toBeChecked();
      });

      expect(mockToggleTask).toHaveBeenCalledWith("1", false);
    });
  });

  describe("Delete interaction", () => {
    it("optimistically removes task when Delete is clicked", async () => {
      const user = userEvent.setup();
      const tasks = [
        createTask({ id: "1", title: "Task to delete" }),
        createTask({ id: "2", title: "Remaining task" }),
      ];
      mockDeleteTask.mockResolvedValue({ error: null });

      render(<TaskList tasks={tasks} />);

      expect(screen.getByText("Task to delete")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: 'Delete "Task to delete"' }));

      // Optimistic: task should be removed
      await waitFor(() => {
        expect(screen.queryByText("Task to delete")).not.toBeInTheDocument();
      });
      expect(screen.getByText("Remaining task")).toBeInTheDocument();
      expect(mockDeleteTask).toHaveBeenCalledWith("1");
    });

    it("rolls back delete on server error", async () => {
      const user = userEvent.setup();
      const tasks = [createTask({ id: "1", title: "Task to delete" })];
      mockDeleteTask.mockResolvedValue({ error: "Delete failed" });

      render(<TaskList tasks={tasks} />);

      await user.click(screen.getByRole("button", { name: 'Delete "Task to delete"' }));

      // After error, task should reappear
      await waitFor(() => {
        expect(screen.getByText("Task to delete")).toBeInTheDocument();
      });
    });
  });

  describe("Edit flow", () => {
    it("shows edit input with current title when Edit is clicked", async () => {
      const user = userEvent.setup();
      const tasks = [createTask({ id: "1", title: "Original Title" })];

      render(<TaskList tasks={tasks} />);

      await user.click(screen.getByRole("button", { name: 'Edit "Original Title"' }));

      const editInput = screen.getByLabelText("Edit task title");
      expect(editInput).toBeInTheDocument();
      expect(editInput).toHaveValue("Original Title");
    });

    it("saves edited title when Save is clicked", async () => {
      const user = userEvent.setup();
      const tasks = [createTask({ id: "1", title: "Original Title" })];
      mockUpdateTask.mockResolvedValue({ error: null });

      render(<TaskList tasks={tasks} />);

      await user.click(screen.getByRole("button", { name: 'Edit "Original Title"' }));

      const editInput = screen.getByLabelText("Edit task title");
      await user.clear(editInput);
      await user.type(editInput, "Updated Title");
      await user.click(screen.getByRole("button", { name: "Save" }));

      // Should call updateTask with trimmed title
      expect(mockUpdateTask).toHaveBeenCalledWith("1", "Updated Title");

      // Should optimistically show updated title
      await waitFor(() => {
        expect(screen.getByText("Updated Title")).toBeInTheDocument();
      });
    });

    it("reverts to view mode when Cancel is clicked", async () => {
      const user = userEvent.setup();
      const tasks = [createTask({ id: "1", title: "Original Title" })];

      render(<TaskList tasks={tasks} />);

      await user.click(screen.getByRole("button", { name: 'Edit "Original Title"' }));
      expect(screen.getByLabelText("Edit task title")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Cancel" }));

      // Should go back to view mode
      expect(screen.queryByLabelText("Edit task title")).not.toBeInTheDocument();
      expect(screen.getByText("Original Title")).toBeInTheDocument();
    });

    it("does not save when edit title is empty", async () => {
      const user = userEvent.setup();
      const tasks = [createTask({ id: "1", title: "Original Title" })];

      render(<TaskList tasks={tasks} />);

      await user.click(screen.getByRole("button", { name: 'Edit "Original Title"' }));

      const editInput = screen.getByLabelText("Edit task title");
      await user.clear(editInput);
      await user.click(screen.getByRole("button", { name: "Save" }));

      // updateTask should NOT have been called
      expect(mockUpdateTask).not.toHaveBeenCalled();

      // Should stay in edit mode
      expect(screen.getByLabelText("Edit task title")).toBeInTheDocument();
    });

    it("does not save when edit title is only whitespace", async () => {
      const user = userEvent.setup();
      const tasks = [createTask({ id: "1", title: "Original Title" })];

      render(<TaskList tasks={tasks} />);

      await user.click(screen.getByRole("button", { name: 'Edit "Original Title"' }));

      const editInput = screen.getByLabelText("Edit task title");
      await user.clear(editInput);
      await user.type(editInput, "   ");
      await user.click(screen.getByRole("button", { name: "Save" }));

      expect(mockUpdateTask).not.toHaveBeenCalled();
    });

    it("rolls back edit on server error", async () => {
      const user = userEvent.setup();
      const tasks = [createTask({ id: "1", title: "Original Title" })];
      mockUpdateTask.mockResolvedValue({ error: "Update failed" });

      render(<TaskList tasks={tasks} />);

      await user.click(screen.getByRole("button", { name: 'Edit "Original Title"' }));

      const editInput = screen.getByLabelText("Edit task title");
      await user.clear(editInput);
      await user.type(editInput, "New Title");
      await user.click(screen.getByRole("button", { name: "Save" }));

      // After server error, should roll back to original title
      await waitFor(() => {
        expect(screen.getByText("Original Title")).toBeInTheDocument();
      });
    });
  });
});
