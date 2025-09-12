// __tests__/app/rootLayout.test.tsx
import { render, screen } from "@testing-library/react"

import { Toaster } from "@/components/ui/sonner"
import RootLayout from "@/app/layout"

jest.mock("@/components/ui/sonner", () => ({
  Toaster: jest.fn(() => <div data-testid="toaster" />),
}))

describe("RootLayout", () => {
  // it("renders children correctly", () => {
  //   render(
  //     <RootLayout>
  //       <div data-testid="child">Hello World</div>
  //     </RootLayout>
  //   )
  //   expect(screen.getByTestId("child")).toHaveTextContent("Hello World")
  // })

  it("renders Toaster component", () => {
    render(
      <RootLayout>
        <div />
      </RootLayout>
    )
    expect(screen.getByTestId("toaster")).toBeInTheDocument()
  })

  it("applies a class to body", () => {
    const { container } = render(
      <RootLayout>
        <div />
      </RootLayout>
    )
    const body = container.querySelector("body")
    expect(body?.className).toBeTruthy() // check that some class exists
  })

  // Skip testing suppressHydrationWarning and html lang, since jsdom doesn't handle them
})
