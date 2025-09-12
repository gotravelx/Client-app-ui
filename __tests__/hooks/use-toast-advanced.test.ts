import { renderHook, act } from "@testing-library/react"
import { useToast, toast as globalToast } from "@/hooks/use-toast"

describe("useToast Hook - Full Coverage", () => {
  beforeEach(() => {
    // Clear memory state before each test
    act(() => {
      // dismiss any existing toast
      globalToast({ title: "reset" }).dismiss()
    })
  })

  it("adds a toast", () => {
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.toast({ title: "Test Toast" })
    })

    expect(result.current.toasts.length).toBe(1)
    expect(result.current.toasts[0].title).toBe("Test Toast")
    expect(result.current.toasts[0].open).toBe(true)
  })

  it("enforces TOAST_LIMIT", () => {
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.toast({ title: "Toast 1" })
      result.current.toast({ title: "Toast 2" })
    })

    // TOAST_LIMIT = 1
    expect(result.current.toasts.length).toBe(1)
    expect(result.current.toasts[0].title).toBe("Toast 2")
  })

  it("dismisses a specific toast by ID", () => {
    const { result } = renderHook(() => useToast())

    let toastId: string = ""
    act(() => {
      const t = result.current.toast({ title: "Dismiss Me" })
      toastId = t.id
    })

    act(() => {
      result.current.dismiss(toastId)
    })

    expect(result.current.toasts[0].open).toBe(false)
  })

  it("dismisses all toasts when no ID is provided", () => {
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.toast({ title: "Toast 1" })
      result.current.toast({ title: "Toast 2" })
    })

    act(() => {
      result.current.dismiss()
    })

    expect(result.current.toasts.every((t) => t.open === false)).toBe(true)
  })

  it("updates a toast", () => {
    const { result } = renderHook(() => useToast())

    let toastId: string = ""
    act(() => {
      const t = result.current.toast({ title: "Old Title" })
      toastId = t.id
      t.update({ title: "New Title" })
    })

    expect(result.current.toasts[0].title).toBe("New Title")
  })

  it("removes toast after dismiss timeout", () => {
    jest.useFakeTimers()
    const { result } = renderHook(() => useToast())

    let toastId: string = ""
    act(() => {
      const t = result.current.toast({ title: "Auto Remove" })
      toastId = t.id
      t.dismiss()
    })

    act(() => {
      jest.advanceTimersByTime(1000000) // TOAST_REMOVE_DELAY
    })

    expect(result.current.toasts.find((t) => t.id === toastId)).toBeUndefined()
    jest.useRealTimers()
  })

  it("handles toast with onOpenChange callback", () => {
    const { result } = renderHook(() => useToast())

    let closed = false
    let myToast: ReturnType<typeof result.current.toast>

    act(() => {
      myToast = result.current.toast({
        title: "Test Open Change",
        onOpenChange: (open) => {
          if (!open) closed = true
        },
      })
    })

    act(() => {
      result.current.toasts.forEach((t) => t.onOpenChange?.(false))
    })

    expect(closed).toBe(false)
  })

  it("adds multiple toasts with unique IDs", () => {
    const { result } = renderHook(() => useToast())

    let ids: string[] = []
    act(() => {
      ids.push(result.current.toast({ title: "Toast 1" }).id)
      ids.push(result.current.toast({ title: "Toast 2" }).id)
    })

    expect(ids[0]).not.toBe(ids[1])
  })

  it("handles toast without title or description", () => {
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.toast({})
    })

    expect(result.current.toasts.length).toBe(1)
  })
})
