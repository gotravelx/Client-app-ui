import { SearchBar } from "@/components/search-bar"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"


function SearchWrapper() {
  const [loading, setLoading] = useState(false)

  const handleSearch = async (flightNumber: string) => {
    setLoading(true)
    await new Promise((r) => setTimeout(r, 50))
    setLoading(false)
  }

  return <SearchBar onSearch={handleSearch} loading={loading} />
}

test("displays loading spinner during search", async () => {
  render(<SearchWrapper />)
  const user = userEvent.setup()

  const input = screen.getByPlaceholderText(/Enter flight number/i)
  const button = screen.getByRole("button", { name: /search/i })

  await user.type(input, "UA3682")
  await user.keyboard("{Enter}")

  // Spinner should appear
  const spinner = await screen.findByTestId("loading-spinner")
  expect(spinner).toBeInTheDocument()

  // Button should be disabled while loading
  expect(button).toBeDisabled()
})
