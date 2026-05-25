import "@testing-library/jest-dom";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    prefetch: jest.fn(),
  })),
  usePathname: jest.fn(() => "/"),
  useSearchParams: jest.fn(() => new URLSearchParams()),
  redirect: jest.fn(),
  notFound: jest.fn(),
}));

jest.mock("next-auth/react", () => ({
  useSession: jest.fn(() => ({
    data: null,
    status: "unauthenticated",
    update: jest.fn(),
  })),
  signIn: jest.fn(),
  signOut: jest.fn(),
  getSession: jest.fn(() => Promise.resolve(null)),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));