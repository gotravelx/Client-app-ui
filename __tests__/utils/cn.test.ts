import { cn } from "@/lib/utils"

describe("cn utility function", () => {
  it("merges class names correctly", () => {
    const result = cn("px-4", "py-2", "bg-blue-500")
    expect(result).toBe("px-4 py-2 bg-blue-500")
  })

  it("handles conditional classes", () => {
    const isActive = true
    const result = cn("base-class", isActive && "active-class", "another-class")
    expect(result).toBe("base-class active-class another-class")
  })

  it("filters out falsy values", () => {
    const result = cn("class1", false, null, undefined, "", "class2")
    expect(result).toBe("class1 class2")
  })

  it("handles Tailwind class conflicts by keeping the last one", () => {
    const result = cn("px-4 px-6", "py-2 py-4")
    // Should keep the last conflicting class
    expect(result).toContain("px-6")
    expect(result).toContain("py-4")
    expect(result).not.toContain("px-4")
    expect(result).not.toContain("py-2")
  })

  it("works with arrays", () => {
    const result = cn(["class1", "class2"], "class3")
    expect(result).toBe("class1 class2 class3")
  })

  it("works with objects", () => {
    const result = cn({
      class1: true,
      class2: false,
      class3: true,
    })
    expect(result).toBe("class1 class3")
  })

  it("handles empty input", () => {
    const result = cn()
    expect(result).toBe("")
  })

  it("handles mixed input types", () => {
    const result = cn(
      "base",
      ["array1", "array2"],
      { conditional: true, disabled: false },
      true && "conditional-class",
      false && "hidden-class",
    )
    expect(result).toBe("base array1 array2 conditional conditional-class")
  })

  it("handles nested arrays", () => {
    const result = cn("base", [["nested1", "nested2"], "array3"])
    expect(result).toBe("base nested1 nested2 array3")
  })

  it("handles complex Tailwind conflicts", () => {
    const result = cn("text-sm text-lg", "bg-red-500 bg-blue-500", "p-2 px-4 py-6")
    expect(result).toContain("text-lg")
    expect(result).toContain("bg-blue-500")
    expect(result).toContain("px-4")
    expect(result).toContain("py-6")
    expect(result).not.toContain("text-sm")
    expect(result).not.toContain("bg-red-500")
    // p-2 sets both px and py, but px-4 and py-6 override the individual directions
    expect(result).toContain("p-2") // p-2 is kept as it doesn't fully conflict with px-4 py-6
  })
})
