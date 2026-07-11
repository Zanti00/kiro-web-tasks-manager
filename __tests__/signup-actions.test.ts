import { describe, it, expect, vi, beforeEach } from "vitest";
import { signup } from "@/app/signup/actions";

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
const mockSignUp = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      signUp: mockSignUp,
    },
  })),
}));

import { redirect } from "next/navigation";

describe("app/signup/actions.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("signup", () => {
    it("returns error when email is missing", async () => {
      const formData = new FormData();
      formData.set("email", "");
      formData.set("password", "password123");

      const result = await signup(formData);

      expect(result).toEqual({ error: "Email and password are required." });
      expect(mockSignUp).not.toHaveBeenCalled();
    });

    it("returns error when password is missing", async () => {
      const formData = new FormData();
      formData.set("email", "user@example.com");
      formData.set("password", "");

      const result = await signup(formData);

      expect(result).toEqual({ error: "Email and password are required." });
      expect(mockSignUp).not.toHaveBeenCalled();
    });

    it("returns error when both email and password are missing", async () => {
      const formData = new FormData();
      formData.set("email", "");
      formData.set("password", "");

      const result = await signup(formData);

      expect(result).toEqual({ error: "Email and password are required." });
    });

    it("returns error when signUp fails", async () => {
      const formData = new FormData();
      formData.set("email", "user@example.com");
      formData.set("password", "weakpw");

      mockSignUp.mockResolvedValue({
        error: { message: "Password should be at least 6 characters" },
      });

      const result = await signup(formData);

      expect(result).toEqual({
        error: "Password should be at least 6 characters",
      });
      expect(mockSignUp).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "weakpw",
      });
    });

    it("redirects to /login?signup=success on successful signup", async () => {
      const formData = new FormData();
      formData.set("email", "newuser@example.com");
      formData.set("password", "strongpassword");

      mockSignUp.mockResolvedValue({ error: null });

      await expect(signup(formData)).rejects.toThrow(REDIRECT_ERROR);

      expect(mockSignUp).toHaveBeenCalledWith({
        email: "newuser@example.com",
        password: "strongpassword",
      });
      expect(redirect).toHaveBeenCalledWith("/login?signup=success");
    });
  });
});
