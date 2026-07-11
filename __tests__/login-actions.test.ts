import { describe, it, expect, vi, beforeEach } from "vitest";
import { login } from "@/app/login/actions";

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
const mockSignInWithPassword = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
    },
  })),
}));

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

describe("app/login/actions.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("login", () => {
    it("returns error when email is missing", async () => {
      const formData = new FormData();
      formData.set("email", "");
      formData.set("password", "password123");

      const result = await login(formData);

      expect(result).toEqual({ error: "Email and password are required." });
      expect(mockSignInWithPassword).not.toHaveBeenCalled();
    });

    it("returns error when password is missing", async () => {
      const formData = new FormData();
      formData.set("email", "user@example.com");
      formData.set("password", "");

      const result = await login(formData);

      expect(result).toEqual({ error: "Email and password are required." });
      expect(mockSignInWithPassword).not.toHaveBeenCalled();
    });

    it("returns error when both email and password are missing", async () => {
      const formData = new FormData();
      formData.set("email", "");
      formData.set("password", "");

      const result = await login(formData);

      expect(result).toEqual({ error: "Email and password are required." });
    });

    it("returns error when signInWithPassword fails", async () => {
      const formData = new FormData();
      formData.set("email", "user@example.com");
      formData.set("password", "wrongpassword");

      mockSignInWithPassword.mockResolvedValue({
        error: { message: "Invalid login credentials" },
      });

      const result = await login(formData);

      expect(result).toEqual({ error: "Invalid login credentials" });
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "wrongpassword",
      });
    });

    it("revalidates path and redirects to / on successful login", async () => {
      const formData = new FormData();
      formData.set("email", "user@example.com");
      formData.set("password", "correctpassword");

      mockSignInWithPassword.mockResolvedValue({ error: null });

      await expect(login(formData)).rejects.toThrow(REDIRECT_ERROR);

      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "correctpassword",
      });
      expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
      expect(redirect).toHaveBeenCalledWith("/");
    });
  });
});
