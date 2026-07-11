import { describe, it, expect, vi, beforeEach } from "vitest";
import { createTask, updateTask, deleteTask, toggleTask, signOut } from "@/app/actions";

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock next/navigation - redirect throws in Next.js
const REDIRECT_ERROR = "NEXT_REDIRECT";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    const error = new Error(REDIRECT_ERROR) as Error & { digest: string };
    error.digest = `NEXT_REDIRECT;${url}`;
    throw error;
  }),
}));

// Mock Supabase client
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockEq = vi.fn();
const mockGetUser = vi.fn();
const mockSignOut = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: vi.fn((table: string) => ({
      insert: mockInsert,
      update: (data: Record<string, unknown>) => {
        mockUpdate(data);
        return { eq: mockEq };
      },
      delete: () => {
        mockDelete();
        return { eq: mockEq };
      },
    })),
    auth: {
      getUser: mockGetUser,
      signOut: mockSignOut,
    },
  })),
}));

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

describe("app/actions.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createTask", () => {
    it("returns error when title is empty", async () => {
      const formData = new FormData();
      formData.set("title", "");

      const result = await createTask(formData);

      expect(result).toEqual({ error: "Title cannot be empty." });
      expect(mockGetUser).not.toHaveBeenCalled();
    });

    it("returns error when title is only whitespace", async () => {
      const formData = new FormData();
      formData.set("title", "   ");

      const result = await createTask(formData);

      expect(result).toEqual({ error: "Title cannot be empty." });
    });

    it("redirects to /login when user is not authenticated", async () => {
      const formData = new FormData();
      formData.set("title", "New Task");
      mockGetUser.mockResolvedValue({ data: { user: null } });

      await expect(createTask(formData)).rejects.toThrow(REDIRECT_ERROR);
      expect(redirect).toHaveBeenCalledWith("/login");
    });

    it("returns error when supabase insert fails", async () => {
      const formData = new FormData();
      formData.set("title", "New Task");
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
      });
      mockInsert.mockResolvedValue({
        error: { message: "Database connection failed" },
      });

      const result = await createTask(formData);

      expect(result).toEqual({ error: "Database connection failed" });
      expect(mockInsert).toHaveBeenCalledWith({
        title: "New Task",
        user_id: "user-123",
      });
    });

    it("calls revalidatePath and returns success on valid input", async () => {
      const formData = new FormData();
      formData.set("title", "  New Task  ");
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-456" } },
      });
      mockInsert.mockResolvedValue({ error: null });

      const result = await createTask(formData);

      expect(result).toEqual({ success: true });
      expect(mockInsert).toHaveBeenCalledWith({
        title: "New Task",
        user_id: "user-456",
      });
      expect(revalidatePath).toHaveBeenCalledWith("/");
    });
  });

  describe("updateTask", () => {
    it("returns error when title is empty", async () => {
      const result = await updateTask("task-1", "");

      expect(result).toEqual({ error: "Title cannot be empty." });
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("returns error when title is only whitespace", async () => {
      const result = await updateTask("task-1", "   ");

      expect(result).toEqual({ error: "Title cannot be empty." });
    });

    it("returns error when supabase update fails", async () => {
      mockEq.mockResolvedValue({
        error: { message: "Row not found" },
      });

      const result = await updateTask("task-1", "Updated Title");

      expect(result).toEqual({ error: "Row not found" });
      expect(mockUpdate).toHaveBeenCalledWith({ title: "Updated Title" });
      expect(mockEq).toHaveBeenCalledWith("id", "task-1");
    });

    it("calls revalidatePath and returns success on valid input", async () => {
      mockEq.mockResolvedValue({ error: null });

      const result = await updateTask("task-2", "  Updated Title  ");

      expect(result).toEqual({ success: true });
      expect(mockUpdate).toHaveBeenCalledWith({ title: "Updated Title" });
      expect(mockEq).toHaveBeenCalledWith("id", "task-2");
      expect(revalidatePath).toHaveBeenCalledWith("/");
    });
  });

  describe("deleteTask", () => {
    it("returns error when supabase delete fails", async () => {
      mockEq.mockResolvedValue({
        error: { message: "Permission denied" },
      });

      const result = await deleteTask("task-1");

      expect(result).toEqual({ error: "Permission denied" });
      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith("id", "task-1");
    });

    it("calls revalidatePath and returns success", async () => {
      mockEq.mockResolvedValue({ error: null });

      const result = await deleteTask("task-3");

      expect(result).toEqual({ success: true });
      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith("id", "task-3");
      expect(revalidatePath).toHaveBeenCalledWith("/");
    });
  });

  describe("toggleTask", () => {
    it("returns error when supabase update fails", async () => {
      mockEq.mockResolvedValue({
        error: { message: "Database error" },
      });

      const result = await toggleTask("task-1", true);

      expect(result).toEqual({ error: "Database error" });
      expect(mockUpdate).toHaveBeenCalledWith({ is_complete: true });
      expect(mockEq).toHaveBeenCalledWith("id", "task-1");
    });

    it("calls revalidatePath and returns success with is_complete=true", async () => {
      mockEq.mockResolvedValue({ error: null });

      const result = await toggleTask("task-4", true);

      expect(result).toEqual({ success: true });
      expect(mockUpdate).toHaveBeenCalledWith({ is_complete: true });
      expect(mockEq).toHaveBeenCalledWith("id", "task-4");
      expect(revalidatePath).toHaveBeenCalledWith("/");
    });

    it("calls revalidatePath and returns success with is_complete=false", async () => {
      mockEq.mockResolvedValue({ error: null });

      const result = await toggleTask("task-5", false);

      expect(result).toEqual({ success: true });
      expect(mockUpdate).toHaveBeenCalledWith({ is_complete: false });
      expect(mockEq).toHaveBeenCalledWith("id", "task-5");
      expect(revalidatePath).toHaveBeenCalledWith("/");
    });
  });

  describe("signOut", () => {
    it("calls supabase.auth.signOut and redirects to /login", async () => {
      mockSignOut.mockResolvedValue({ error: null });

      await expect(signOut()).rejects.toThrow(REDIRECT_ERROR);

      expect(mockSignOut).toHaveBeenCalled();
      expect(redirect).toHaveBeenCalledWith("/login");
    });
  });
});
