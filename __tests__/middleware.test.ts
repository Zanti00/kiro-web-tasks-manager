/**
 * @jest-environment node
 */

import { NextRequest, NextResponse } from "next/server";

jest.mock("@supabase/ssr", () => ({
  createServerClient: jest.fn(),
}));

import { createServerClient } from "@supabase/ssr";
import { middleware, config } from "@/middleware";

describe("middleware", () => {
  const mockGetUser = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

    (createServerClient as jest.Mock).mockReturnValue({
      auth: {
        getUser: mockGetUser,
      },
    });
  });

  function createMockRequest(pathname: string): NextRequest {
    const url = new URL(pathname, "http://localhost:3000");
    return new NextRequest(url);
  }

  it("should allow authenticated user to pass through", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });

    const request = createMockRequest("/");
    const response = await middleware(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("should redirect unauthenticated user on protected route to /login", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const request = createMockRequest("/");
    const response = await middleware(request);

    expect(response.status).toBe(307);
    const locationUrl = new URL(response.headers.get("location")!);
    expect(locationUrl.pathname).toBe("/login");
  });

  it("should not redirect unauthenticated user on /login", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const request = createMockRequest("/login");
    const response = await middleware(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("should not redirect unauthenticated user on /signup", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const request = createMockRequest("/signup");
    const response = await middleware(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("should redirect unauthenticated user on /dashboard", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const request = createMockRequest("/dashboard");
    const response = await middleware(request);

    expect(response.status).toBe(307);
    const locationUrl = new URL(response.headers.get("location")!);
    expect(locationUrl.pathname).toBe("/login");
  });

  describe("config.matcher", () => {
    // Next.js matcher pattern: the inner regex (the capture group) is tested
    // against the path segment after the leading "/". Extract the inner pattern.
    const matcher = config.matcher[0];
    // The matcher format is "/(inner_regex)" - extract the inner part for testing
    const innerPattern = matcher.slice(2, -1); // remove leading "/(" and trailing ")"
    const regex = new RegExp(`^${innerPattern}$`);

    // Helper: test path segment without leading "/"
    function matchesPath(path: string): boolean {
      const segment = path.startsWith("/") ? path.slice(1) : path;
      return regex.test(segment);
    }

    it("should not match static assets (_next/static)", () => {
      expect(matchesPath("/_next/static/chunk.js")).toBe(false);
    });

    it("should not match image optimization paths (_next/image)", () => {
      expect(matchesPath("/_next/image/photo.png")).toBe(false);
    });

    it("should not match favicon.ico", () => {
      expect(matchesPath("/favicon.ico")).toBe(false);
    });

    it("should not match public image assets", () => {
      expect(matchesPath("/logo.svg")).toBe(false);
      expect(matchesPath("/photo.png")).toBe(false);
      expect(matchesPath("/image.jpg")).toBe(false);
      expect(matchesPath("/pic.jpeg")).toBe(false);
      expect(matchesPath("/anim.gif")).toBe(false);
      expect(matchesPath("/hero.webp")).toBe(false);
    });

    it("should match regular routes", () => {
      expect(matchesPath("/")).toBe(true);
      expect(matchesPath("/dashboard")).toBe(true);
      expect(matchesPath("/login")).toBe(true);
      expect(matchesPath("/signup")).toBe(true);
    });
  });
});
