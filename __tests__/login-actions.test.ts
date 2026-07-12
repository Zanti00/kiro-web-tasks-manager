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
import { login } from "@/app/login/actions";

describe("app/login/actions - login", () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    resetNextMocks();
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    (createClient as jest.Mock).mockResolvedValue(mockSupabase.client);
  });

  it("should sign in successfully and redirect to /", async () => {
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: { id: "user-123" }, session: {} },
      error: null,
    });

    const formData = new FormData();
    formData.set("email", "test@example.com");
    formData.set("password", "password123");

    await login(formData);

    expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "password123",
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/", "layout");
    expect(mockRedirect).toHaveBeenCalledWith("/");
  });

  it("should return an error if email is missing", async () => {
    const formData = new FormData();
    formData.set("password", "password123");

    const result = await login(formData);

    expect(result).toEqual({ error: "Email and password are required." });
    expect(mockSupabase.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("should return an error if password is missing", async () => {
    const formData = new FormData();
    formData.set("email", "test@example.com");

    const result = await login(formData);

    expect(result).toEqual({ error: "Email and password are required." });
    expect(mockSupabase.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("should return an error if Supabase auth fails", async () => {
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "Invalid login credentials", code: "invalid_credentials" },
    });

    const formData = new FormData();
    formData.set("email", "test@example.com");
    formData.set("password", "wrong-password");

    const result = await login(formData);

    expect(result).toEqual({ error: "Invalid login credentials" });
    expect(mockRedirect).not.toHaveBeenCalled();
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });
});
