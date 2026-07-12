import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TaskList from "@/app/components/TaskList";

// Mock the server actions module
jest.mock("@/app/actions", () => ({
  toggleTask: jest.fn(),
  updateTask: jest.fn(),
  deleteTask: jest.fn(),
}));

import { toggleTask, updateTask, deleteTask } from "@/app/actions";

const mockToggleTask = toggleTask as jest.MockedFunction<typeof toggleTask>;
const mockUpdateTask = updateTask as jest.MockedFunction<typeof updateTask>;
const mockDeleteTask = deleteTask as jest.MockedFunction<typeof deleteTask>;

const sampleTasks = [
  {
    id: "1",
    title: "Buy groceries",
    is_complete: false,
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "2",
    title: "Walk the dog",
    is_complete: true,
    created_at: "2024-01-02T00:00:00Z",
  },
  {
    id: "3",
    title: "Read a book",
    is_complete: false,
    created_at: "2024-01-03T00:00:00Z",
  },
];

describe("TaskList", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders empty state message when no tasks", () => {
    render(<TaskList tasks={[]} />);

    expect(
      screen.getByText("No tasks yet. Add one above to get started.")
    ).toBeInTheDocument();
  });

  it("renders list of tasks with titles and checkboxes", () => {
    render(<TaskList tasks={sampleTasks} />);

    expect(screen.getByText("Buy groceries")).toBeInTheDocument();
    expect(screen.getByText("Walk the dog")).toBeInTheDocument();
    expect(screen.getByText("Read a book")).toBeInTheDocument();

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes).toHaveLength(3);

    // Second task is complete
    expect(checkboxes[0]).not.toBeChecked();
    expect(checkboxes[1]).toBeChecked();
    expect(checkboxes[2]).not.toBeChecked();
  });

  it("toggle checkbox calls toggleTask and optimistically updates UI", async () => {
    mockToggleTask.mockResolvedValue({ success: true });

    const user = userEvent.setup();
    render(<TaskList tasks={sampleTasks} />);

    const checkbox = screen.getByRole("checkbox", {
      name: /Mark "Buy groceries" as complete/,
    });

    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);

    // Optimistic update: checkbox should be checked immediately
    expect(checkbox).toBeChecked();

    await waitFor(() => {
      expect(mockToggleTask).toHaveBeenCalledWith("1", true);
    });
  });

  it("clicking Delete calls deleteTask and removes item optimistically", async () => {
    mockDeleteTask.mockResolvedValue({ success: true });

    const user = userEvent.setup();
    render(<TaskList tasks={sampleTasks} />);

    expect(screen.getByText("Buy groceries")).toBeInTheDocument();

    const deleteButton = screen.getByRole("button", {
      name: /Delete "Buy groceries"/,
    });
    await user.click(deleteButton);

    // Optimistic update: item should be removed immediately
    expect(screen.queryByText("Buy groceries")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(mockDeleteTask).toHaveBeenCalledWith("1");
    });
  });

  it("clicking Edit shows inline edit form with current title", async () => {
    const user = userEvent.setup();
    render(<TaskList tasks={sampleTasks} />);

    const editButton = screen.getByRole("button", {
      name: /Edit "Buy groceries"/,
    });
    await user.click(editButton);

    // Should show edit input with current title
    const editInput = screen.getByLabelText("Edit task title");
    expect(editInput).toBeInTheDocument();
    expect(editInput).toHaveValue("Buy groceries");

    // Should show Save and Cancel buttons
    expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /cancel/i })
    ).toBeInTheDocument();
  });

  it("saving edit calls updateTask and updates displayed title", async () => {
    mockUpdateTask.mockResolvedValue({ success: true });

    const user = userEvent.setup();
    render(<TaskList tasks={sampleTasks} />);

    const editButton = screen.getByRole("button", {
      name: /Edit "Buy groceries"/,
    });
    await user.click(editButton);

    const editInput = screen.getByLabelText("Edit task title");
    await user.clear(editInput);
    await user.type(editInput, "Buy organic groceries");

    const saveButton = screen.getByRole("button", { name: /save/i });
    await user.click(saveButton);

    // Optimistic update: title should change immediately
    await waitFor(() => {
      expect(screen.getByText("Buy organic groceries")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(mockUpdateTask).toHaveBeenCalledWith("1", "Buy organic groceries");
    });
  });

  it("cancel edit reverts to non-editing state", async () => {
    const user = userEvent.setup();
    render(<TaskList tasks={sampleTasks} />);

    const editButton = screen.getByRole("button", {
      name: /Edit "Buy groceries"/,
    });
    await user.click(editButton);

    // Verify we're in edit mode
    expect(screen.getByLabelText("Edit task title")).toBeInTheDocument();

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    await user.click(cancelButton);

    // Should revert to non-editing state
    expect(screen.queryByLabelText("Edit task title")).not.toBeInTheDocument();
    expect(screen.getByText("Buy groceries")).toBeInTheDocument();
  });

  it("handles rollback on toggleTask error", async () => {
    let resolveToggle: (value: { error: string }) => void;
    const togglePromise = new Promise<{ error: string }>((resolve) => {
      resolveToggle = resolve;
    });
    mockToggleTask.mockReturnValue(togglePromise);

    const user = userEvent.setup();
    render(<TaskList tasks={sampleTasks} />);

    const checkbox = screen.getByRole("checkbox", {
      name: /Mark "Buy groceries" as complete/,
    });

    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);

    // Optimistic update: checked
    await waitFor(() => {
      expect(checkbox).toBeChecked();
    });

    // Now resolve with error to trigger rollback
    resolveToggle!({ error: "Network error" });

    // After error, should rollback to unchecked
    await waitFor(() => {
      expect(checkbox).not.toBeChecked();
    });
  });

  it("handles rollback on deleteTask error", async () => {
    let resolveDelete: (value: { error: string }) => void;
    const deletePromise = new Promise<{ error: string }>((resolve) => {
      resolveDelete = resolve;
    });
    mockDeleteTask.mockReturnValue(deletePromise);

    const user = userEvent.setup();
    render(<TaskList tasks={sampleTasks} />);

    expect(screen.getByText("Buy groceries")).toBeInTheDocument();

    const deleteButton = screen.getByRole("button", {
      name: /Delete "Buy groceries"/,
    });
    await user.click(deleteButton);

    // Optimistic update: removed
    await waitFor(() => {
      expect(screen.queryByText("Buy groceries")).not.toBeInTheDocument();
    });

    // Now resolve with error to trigger rollback
    resolveDelete!({ error: "Failed to delete" });

    // After error, should rollback and show the item again
    await waitFor(() => {
      expect(screen.getByText("Buy groceries")).toBeInTheDocument();
    });
  });
});
