"use client"

import { renderHook } from "@testing-library/react"
import { useIsMobile } from "@/hooks/use-mobile"
import { jest } from "@jest/globals"

describe("useIsMobile", () => {
  const originalInnerWidth = window.innerWidth
  const originalMatchMedia = window.matchMedia

  beforeEach(() => {
    // Mock matchMedia with proper implementation
    window.matchMedia = jest.fn().mockImplementation((query) => ({
      matches: query === "(max-width: 767px)" ? window.innerWidth <= 767 : false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }))
  })

  afterEach(() => {
    // Reset window.innerWidth and matchMedia
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    })
    window.matchMedia = originalMatchMedia
  })

  it("returns true for mobile screen sizes", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 500, // Less than 768px
    })

    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
  })

  it("returns false for desktop screen sizes", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1024, // Greater than 768px
    })

    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })

  it("returns false for exactly 768px", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 768,
    })

    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })

  it("returns true for 767px (just below breakpoint)", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 767,
    })

    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
  })

  it("handles common mobile device widths correctly", () => {
    const mobileWidths = [320, 375, 414, 480, 600, 767]

    mobileWidths.forEach((width) => {
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: width,
      })

      const { result } = renderHook(() => useIsMobile())
      expect(result.current).toBe(true)
    })
  })

  it("handles common desktop widths correctly", () => {
    const desktopWidths = [768, 1024, 1280, 1440, 1920]

    desktopWidths.forEach((width) => {
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: width,
      })

      const { result } = renderHook(() => useIsMobile())
      expect(result.current).toBe(false)
    })
  })

  it("uses correct media query", () => {
    const mockMatchMedia = jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }))

    window.matchMedia = mockMatchMedia

    renderHook(() => useIsMobile())

    expect(mockMatchMedia).toHaveBeenCalledWith("(max-width: 767px)")
  })
})
