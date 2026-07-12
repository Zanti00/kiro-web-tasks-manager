import { mockRedirect, resetNextMocks } from "./mocks/next";
import { createMockSupabaseClient } from "./mocks/supabase";

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { signup } from "@/app/signup/actions";

describe("app/signup/actions - signup", () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    resetNextMocks();
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    (createClient as jest.Mock).mockResolvedValue(mockSupabase.client);
  });

  it("should sign up successfully and redirect to /login?signup=success", async () => {
    mockSupabase.auth.signUp.mockResolvedValue({
      data: { user: { id: "user-123" }, session: null },
      error: null,
    });

    const formData = new FormData();
    formData.set("email", "newuser@example.com");
    formData.set("password", "securepass123");

    await signup(formData);

    expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
      email: "newuser@example.com",
      password: "securepass123",
    });
    expect(mockRedirect).toHaveBeenCalledWith("/login?signup=success");
  });

  it("should return an error if email is missing", async () => {
    const formData = new FormData();
    formData.set("password", "securepass123");

    const result = await signup(formData);

    expect(result).toEqual({ error: "Email and password are required." });
    expect(mockSupabase.auth.signUp).not.toHaveBeenCalled();
  });

  it("should return an error if password is missing", async () => {
    const formData = new FormData();
    formData.set("email", "newuser@example.com");

    const result = await signup(formData);

    expect(result).toEqual({ error: "Email and password are required." });
    expect(mockSupabase.auth.signUp).not.toHaveBeenCalled();
  });

  it("should return an error if Supabase signUp fails", async () => {
    mockSupabase.auth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "User already registered", code: "user_already_exists" },
    });

    const formData = new FormData();
    formData.set("email", "existing@example.com");
    formData.set("password", "securepass123");

    const result = await signup(formData);

    expect(result).toEqual({ error: "User already registered" });
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});
