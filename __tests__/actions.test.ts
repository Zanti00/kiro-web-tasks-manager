import {
  mockRevalidatePath,
  mockRedirect,
  resetNextMocks,
} from "./mocks/next";
import { createMockSupabaseClient } from "./mocks/supabase";

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import {
  createTask,
  updateTask,
  deleteTask,
  toggleTask,
  signOut,
} from "@/app/actions";

describe("app/actions", () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    resetNextMocks();
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    (createClient as jest.Mock).mockResolvedValue(mockSupabase.client);
  });

  describe("createTask", () => {
    it("should create a task successfully", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });
      mockSupabase.queryBuilder.insert.mockResolvedValue({
        data: null,
        error: null,
      });

      const formData = new FormData();
      formData.set("title", "New Task");

      const result = await createTask(formData);

      expect(mockSupabase.client.from).toHaveBeenCalledWith("tasks");
      expect(mockSupabase.queryBuilder.insert).toHaveBeenCalledWith({
        title: "New Task",
        user_id: "user-123",
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith("/");
      expect(result).toEqual({ success: true });
    });

    it("should return an error if title is empty", async () => {
      const formData = new FormData();
      formData.set("title", "   ");

      const result = await createTask(formData);

      expect(result).toEqual({ error: "Title cannot be empty." });
      expect(mockSupabase.client.from).not.toHaveBeenCalled();
    });

    it("should redirect to /login if user is not authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const formData = new FormData();
      formData.set("title", "New Task");

      await expect(createTask(formData)).rejects.toThrow("NEXT_REDIRECT");

      expect(mockRedirect).toHaveBeenCalledWith("/login");
      expect(mockSupabase.queryBuilder.insert).not.toHaveBeenCalled();
    });

    it("should return an error if Supabase insert fails", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });
      mockSupabase.queryBuilder.insert.mockResolvedValue({
        data: null,
        error: { message: "Insert failed", code: "23505" },
      });

      const formData = new FormData();
      formData.set("title", "New Task");

      const result = await createTask(formData);

      expect(result).toEqual({ error: "Insert failed" });
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });
  });

  describe("updateTask", () => {
    it("should update a task successfully", async () => {
      const mockEq = jest.fn().mockResolvedValue({ data: null, error: null });
      mockSupabase.queryBuilder.update.mockReturnValue({ eq: mockEq });

      const result = await updateTask("task-1", "Updated Title");

      expect(mockSupabase.client.from).toHaveBeenCalledWith("tasks");
      expect(mockSupabase.queryBuilder.update).toHaveBeenCalledWith({
        title: "Updated Title",
      });
      expect(mockEq).toHaveBeenCalledWith("id", "task-1");
      expect(mockRevalidatePath).toHaveBeenCalledWith("/");
      expect(result).toEqual({ success: true });
    });

    it("should return an error if title is empty", async () => {
      const result = await updateTask("task-1", "  ");

      expect(result).toEqual({ error: "Title cannot be empty." });
      expect(mockSupabase.client.from).not.toHaveBeenCalled();
    });

    it("should return an error if Supabase update fails", async () => {
      const mockEq = jest.fn().mockResolvedValue({
        data: null,
        error: { message: "Update failed", code: "42501" },
      });
      mockSupabase.queryBuilder.update.mockReturnValue({ eq: mockEq });

      const result = await updateTask("task-1", "Updated Title");

      expect(result).toEqual({ error: "Update failed" });
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });
  });

  describe("deleteTask", () => {
    it("should delete a task successfully", async () => {
      const mockEq = jest.fn().mockResolvedValue({ data: null, error: null });
      mockSupabase.queryBuilder.delete.mockReturnValue({ eq: mockEq });

      const result = await deleteTask("task-1");

      expect(mockSupabase.client.from).toHaveBeenCalledWith("tasks");
      expect(mockSupabase.queryBuilder.delete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith("id", "task-1");
      expect(mockRevalidatePath).toHaveBeenCalledWith("/");
      expect(result).toEqual({ success: true });
    });

    it("should return an error if Supabase delete fails", async () => {
      const mockEq = jest.fn().mockResolvedValue({
        data: null,
        error: { message: "Delete failed", code: "42501" },
      });
      mockSupabase.queryBuilder.delete.mockReturnValue({ eq: mockEq });

      const result = await deleteTask("task-1");

      expect(result).toEqual({ error: "Delete failed" });
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });
  });

  describe("toggleTask", () => {
    it("should toggle a task to complete", async () => {
      const mockEq = jest.fn().mockResolvedValue({ data: null, error: null });
      mockSupabase.queryBuilder.update.mockReturnValue({ eq: mockEq });

      const result = await toggleTask("task-1", true);

      expect(mockSupabase.client.from).toHaveBeenCalledWith("tasks");
      expect(mockSupabase.queryBuilder.update).toHaveBeenCalledWith({
        is_complete: true,
      });
      expect(mockEq).toHaveBeenCalledWith("id", "task-1");
      expect(mockRevalidatePath).toHaveBeenCalledWith("/");
      expect(result).toEqual({ success: true });
    });

    it("should toggle a task to incomplete", async () => {
      const mockEq = jest.fn().mockResolvedValue({ data: null, error: null });
      mockSupabase.queryBuilder.update.mockReturnValue({ eq: mockEq });

      const result = await toggleTask("task-1", false);

      expect(mockSupabase.queryBuilder.update).toHaveBeenCalledWith({
        is_complete: false,
      });
      expect(mockEq).toHaveBeenCalledWith("id", "task-1");
      expect(result).toEqual({ success: true });
    });

    it("should return an error if Supabase update fails", async () => {
      const mockEq = jest.fn().mockResolvedValue({
        data: null,
        error: { message: "Toggle failed", code: "42501" },
      });
      mockSupabase.queryBuilder.update.mockReturnValue({ eq: mockEq });

      const result = await toggleTask("task-1", true);

      expect(result).toEqual({ error: "Toggle failed" });
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });
  });

  describe("signOut", () => {
    it("should sign out and redirect to /login", async () => {
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });

      await expect(signOut()).rejects.toThrow("NEXT_REDIRECT");

      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
      expect(mockRedirect).toHaveBeenCalledWith("/login");
    });
  });
});
