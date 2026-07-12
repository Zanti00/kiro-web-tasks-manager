/**
 * Mock factory for the Supabase client.
 * Supports the chaining patterns used throughout the app:
 * - .from('tasks').insert()
 * - .from('tasks').update().eq()
 * - .from('tasks').delete().eq()
 * - .from('tasks').select().order()
 * - auth.getUser()
 * - auth.signInWithPassword()
 * - auth.signUp()
 * - auth.signOut()
 */

type MockResponse<T = unknown> = {
  data: T | null;
  error: { message: string; code: string } | null;
};

const createMockResponse = (
  data: unknown = null,
  error: MockResponse["error"] = null
): MockResponse => ({
  data,
  error,
});

export function createMockSupabaseClient() {
  const mockResponse = createMockResponse();

  const chainMethods = {
    eq: jest.fn().mockReturnValue(Promise.resolve(mockResponse)),
    order: jest.fn().mockReturnValue(Promise.resolve(mockResponse)),
    single: jest.fn().mockReturnValue(Promise.resolve(mockResponse)),
    limit: jest.fn().mockReturnValue(Promise.resolve(mockResponse)),
    match: jest.fn().mockReturnValue(Promise.resolve(mockResponse)),
  };

  // Make chain methods return themselves for further chaining
  chainMethods.eq = jest.fn().mockImplementation(() => ({
    ...chainMethods,
    then: (resolve: (value: MockResponse) => void) => resolve(mockResponse),
    [Symbol.toStringTag]: "Promise",
  }));

  const queryBuilder = {
    insert: jest.fn().mockReturnValue(Promise.resolve(mockResponse)),
    update: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue(Promise.resolve(mockResponse)),
      match: jest.fn().mockReturnValue(Promise.resolve(mockResponse)),
    }),
    delete: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue(Promise.resolve(mockResponse)),
      match: jest.fn().mockReturnValue(Promise.resolve(mockResponse)),
    }),
    select: jest.fn().mockReturnValue({
      order: jest.fn().mockReturnValue(Promise.resolve(mockResponse)),
      eq: jest.fn().mockReturnValue(Promise.resolve(mockResponse)),
      single: jest.fn().mockReturnValue(Promise.resolve(mockResponse)),
      limit: jest.fn().mockReturnValue(Promise.resolve(mockResponse)),
    }),
    upsert: jest.fn().mockReturnValue(Promise.resolve(mockResponse)),
  };

  const auth = {
    getUser: jest.fn().mockResolvedValue({
      data: { user: null },
      error: null,
    }),
    signInWithPassword: jest.fn().mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    }),
    signUp: jest.fn().mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    }),
    signOut: jest.fn().mockResolvedValue({
      error: null,
    }),
  };

  const client = {
    from: jest.fn().mockReturnValue(queryBuilder),
    auth,
  };

  return {
    client,
    queryBuilder,
    auth,
    mockResponse,
  };
}
