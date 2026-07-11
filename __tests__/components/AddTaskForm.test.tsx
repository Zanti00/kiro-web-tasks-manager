import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AddTaskForm from "@/app/components/AddTaskForm";

// Mock the server actions module
const mockCreateTask = vi.fn();

vi.mock("@/app/actions", () => ({
  createTask: (...args: unknown[]) => mockCreateTask(...args),
}));

describe("AddTaskForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateTask.mockResolvedValue({ error: null });
  });

  describe("Rendering", () => {
    it("renders input field and Add button", () => {
      render(<AddTaskForm />);

      expect(screen.getByLabelText("New task title")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Add a new task...")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
    });

    it("input has correct id and name attributes", () => {
      render(<AddTaskForm />);

      const input = screen.getByLabelText("New task title");
      expect(input).toHaveAttribute("id", "new-task-title");
      expect(input).toHaveAttribute("name", "title");
    });
  });

  describe("Client-side validation", () => {
    it("shows error when submitting empty title", async () => {
      const user = userEvent.setup();
      render(<AddTaskForm />);

      const input = screen.getByLabelText("New task title");
      // Set value to empty string (overriding required attribute for the test)
      // The component checks formData.get("title")?.trim() so we need a whitespace-only value
      await user.type(input, "   ");
      // Clear back to trigger the empty condition through the form action
      await user.clear(input);
      // We need to submit with empty value - the form uses action={handleSubmit}
      // The input has required attribute, so let's type spaces instead
      await user.type(input, "   ");

      await user.click(screen.getByRole("button", { name: "Add" }));

      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent("Title cannot be empty.");
      });
      expect(mockCreateTask).not.toHaveBeenCalled();
    });
  });

  describe("Successful submission", () => {
    it("calls createTask with form data on valid submission", async () => {
      const user = userEvent.setup();
      mockCreateTask.mockResolvedValue({ error: null });

      render(<AddTaskForm />);

      const input = screen.getByLabelText("New task title");
      await user.type(input, "New task");
      await user.click(screen.getByRole("button", { name: "Add" }));

      await waitFor(() => {
        expect(mockCreateTask).toHaveBeenCalledTimes(1);
      });

      // Verify the FormData passed contains the title
      const calledFormData = mockCreateTask.mock.calls[0][0] as FormData;
      expect(calledFormData.get("title")).toBe("New task");
    });

    it("resets form after successful creation", async () => {
      const user = userEvent.setup();
      mockCreateTask.mockResolvedValue({ error: null });

      render(<AddTaskForm />);

      const input = screen.getByLabelText("New task title");
      await user.type(input, "New task");
      await user.click(screen.getByRole("button", { name: "Add" }));

      await waitFor(() => {
        expect(input).toHaveValue("");
      });
    });
  });

  describe("Server error handling", () => {
    it("displays server error from createTask response", async () => {
      const user = userEvent.setup();
      mockCreateTask.mockResolvedValue({ error: "Failed to create task" });

      render(<AddTaskForm />);

      const input = screen.getByLabelText("New task title");
      await user.type(input, "New task");
      await user.click(screen.getByRole("button", { name: "Add" }));

      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent("Failed to create task");
      });
    });

    it("clears previous error on new valid submission", async () => {
      const user = userEvent.setup();
      // First call fails, second succeeds
      mockCreateTask.mockResolvedValueOnce({ error: "Server error" });
      mockCreateTask.mockResolvedValueOnce({ error: null });

      render(<AddTaskForm />);

      const input = screen.getByLabelText("New task title");

      // First submission - triggers error
      await user.type(input, "Task");
      await user.click(screen.getByRole("button", { name: "Add" }));

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });

      // Second submission - should clear error
      await user.type(input, "Another task");
      await user.click(screen.getByRole("button", { name: "Add" }));

      await waitFor(() => {
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      });
    });
  });
});
