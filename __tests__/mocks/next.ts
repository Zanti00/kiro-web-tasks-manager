/**
 * Mocks for Next.js modules used in server actions and components.
 * - next/cache: revalidatePath, revalidateTag
 * - next/navigation: redirect, useSearchParams, useRouter
 * - next/headers: cookies
 */

// --- next/cache mocks ---
export const mockRevalidatePath = jest.fn();
export const mockRevalidateTag = jest.fn();

jest.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
  revalidateTag: (...args: unknown[]) => mockRevalidateTag(...args),
}));

// --- next/navigation mocks ---
export const mockRedirect = jest.fn();
export const mockUseSearchParams = jest.fn().mockReturnValue({
  get: jest.fn().mockReturnValue(null),
  getAll: jest.fn().mockReturnValue([]),
  has: jest.fn().mockReturnValue(false),
  toString: jest.fn().mockReturnValue(""),
});
export const mockUseRouter = jest.fn().mockReturnValue({
  push: jest.fn(),
  replace: jest.fn(),
  refresh: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  prefetch: jest.fn(),
});
export const mockUsePathname = jest.fn().mockReturnValue("/");

jest.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => mockRedirect(...args),
  useSearchParams: () => mockUseSearchParams(),
  useRouter: () => mockUseRouter(),
  usePathname: () => mockUsePathname(),
}));

// --- next/headers mocks ---
export const mockCookieStore = {
  get: jest.fn().mockReturnValue(null),
  getAll: jest.fn().mockReturnValue([]),
  set: jest.fn(),
  delete: jest.fn(),
  has: jest.fn().mockReturnValue(false),
};
export const mockCookies = jest.fn().mockResolvedValue(mockCookieStore);

jest.mock("next/headers", () => ({
  cookies: () => mockCookies(),
}));

/**
 * Reset all Next.js mocks between tests.
 * Call this in beforeEach() or afterEach().
 */
export function resetNextMocks() {
  mockRevalidatePath.mockClear();
  mockRevalidateTag.mockClear();
  mockRedirect.mockClear();
  mockUseSearchParams.mockClear();
  mockUseRouter.mockClear();
  mockUsePathname.mockClear();
  mockCookies.mockClear();
  mockCookieStore.get.mockClear();
  mockCookieStore.getAll.mockClear();
  mockCookieStore.set.mockClear();
  mockCookieStore.delete.mockClear();
  mockCookieStore.has.mockClear();
}
