"use client"

import { jest } from "@jest/globals"
import "@testing-library/jest-dom"

jest.setTimeout(30000);

// Mock next/router
jest.mock("next/router", () => ({
  useRouter() {
    return {
      route: "/",
      pathname: "/",
      query: {},
      asPath: "/",
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn(),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
    }
  },
}))

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return "/"
  },
}))

// Mock next-themes
jest.mock("next-themes", () => ({
  useTheme: () => ({
    theme: "light",
    setTheme: jest.fn(),
  }),
  ThemeProvider: ({ children }) => children,
}))

// Mock environment variables
process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.test.com"

// Mock WebSocket
globalThis.WebSocket = jest.fn(() => ({
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  onopen: null,
  onmessage: null,
  onclose: null,
  onerror: null,
}))

// Mock fetch
globalThis.fetch = jest.fn()

// Mock window.matchMedia
Object.defineProperty(globalThis, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock ResizeObserver
globalThis.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock IntersectionObserver
globalThis.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock window.location
delete globalThis.location
globalThis.location = {
  href: "http://localhost",
  assign: jest.fn(),
  replace: jest.fn(),
  reload: jest.fn(),
}

// Mock next/image
jest.mock("next/image", () => ({
  __esModule: true,
  default: (props) => {
    const { src, alt, priority, ...rest } = props;
    const React = require("react");
    return React.createElement("img", {
      ...rest,
      src: typeof src === "object" ? src.src : src,
      alt: alt || "mocked image",
    });
  },
}));

// Mock auth-provider
jest.mock("@/components/auth-provider", () => ({
  useAuth: () => ({
    user: { email: "test@example.com" },
    loading: false,
    walletAddress: "0xabcd",
    isConnected: true,
  }),
  AuthProvider: ({ children }) => children,
}));
