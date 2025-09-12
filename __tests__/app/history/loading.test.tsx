
import Loading from "@/app/history/loading"
import { render, screen } from "@testing-library/react"

describe("Loading component", () => {
  it("renders without crashing", () => {
    const { container } = render(<Loading />)
    expect(container.firstChild).toBeNull() // assuming Loading returns null
  })

  it("matches snapshot", () => {
    const { asFragment } = render(<Loading />)
    expect(asFragment()).toMatchSnapshot()
  })

  it("does not render any visible content", () => {
    render(<Loading />)
    // Since it returns null, nothing should be in the document
    expect(screen.queryByText(/loading/i)).toBeNull()
  })

  it("renders correctly when wrapped in a parent element", () => {
    const { container } = render(
      <div data-testid="parent">
        <Loading />
      </div>
    )
    // The parent should exist
    const parent = screen.getByTestId("parent")
    expect(parent).toBeInTheDocument()
    // The Loading component should not add any children
    expect(parent.firstChild).toBeNull()
  })
})
