import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AddTaskForm from "@/app/components/AddTaskForm";

// Mock the server actions module
jest.mock("@/app/actions", () => ({
  createTask: jest.fn(),
}));

import { createTask } from "@/app/actions";

const mockCreateTask = createTask as jest.MockedFunction<typeof createTask>;

describe("AddTaskForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders input and submit button", () => {
    render(<AddTaskForm />);

    expect(
      screen.getByPlaceholderText("Add a new task...")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /add/i })
    ).toBeInTheDocument();
  });

  it("shows validation error when submitting empty title", async () => {
    const user = userEvent.setup();
    render(<AddTaskForm />);

    const input = screen.getByPlaceholderText("Add a new task...");
    const submitButton = screen.getByRole("button", { name: /add/i });

    // Clear any default value and set empty whitespace
    await user.clear(input);
    await user.type(input, "   ");

    // We need to submit the form. The component uses form action handler.
    // Let's use the submit button.
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Title cannot be empty."
      );
    });

    // createTask should NOT have been called
    expect(mockCreateTask).not.toHaveBeenCalled();
  });

  it("calls createTask server action with form data on valid submit", async () => {
    mockCreateTask.mockResolvedValue({ success: true });

    const user = userEvent.setup();
    render(<AddTaskForm />);

    const input = screen.getByPlaceholderText("Add a new task...");
    const submitButton = screen.getByRole("button", { name: /add/i });

    await user.type(input, "My new task");
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockCreateTask).toHaveBeenCalledTimes(1);
    });

    // Verify it was called with FormData containing the title
    const callArg = mockCreateTask.mock.calls[0][0];
    expect(callArg).toBeInstanceOf(FormData);
    expect((callArg as FormData).get("title")).toBe("My new task");
  });

  it("resets form after successful creation", async () => {
    mockCreateTask.mockResolvedValue({ success: true });

    const user = userEvent.setup();
    render(<AddTaskForm />);

    const input = screen.getByPlaceholderText(
      "Add a new task..."
    ) as HTMLInputElement;
    const submitButton = screen.getByRole("button", { name: /add/i });

    await user.type(input, "My new task");
    await user.click(submitButton);

    await waitFor(() => {
      expect(input).toHaveValue("");
    });
  });

  it("displays server-side error message from createTask result", async () => {
    mockCreateTask.mockResolvedValue({ error: "Database connection failed" });

    const user = userEvent.setup();
    render(<AddTaskForm />);

    const input = screen.getByPlaceholderText("Add a new task...");
    const submitButton = screen.getByRole("button", { name: /add/i });

    await user.type(input, "Valid task title");
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Database connection failed"
      );
    });
  });
});
