const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL

export async function fetchHistoricalFlightData(
  flightNumber: string,
  carrierCode: string,
  fromDate: string,
  toDate: string,
) {
  try {
    const response = await fetch(
      `${baseUrl}/v1/flights/fetch-historical/${flightNumber}/date-range?fromDate=${fromDate}&toDate=${toDate}&carrierCode=${carrierCode}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    )

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error("Error fetching historical flight data:", error)
    throw error
  }
}

export async function decryptFlightData(encryptedData: string[]) {
  try {
    const response = await fetch(`${baseUrl}/v1/flights/decrypt-flight-data`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        encryptedData,
      }),
    })

    if (!response.ok) {
      throw new Error(`Decryption API error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error decrypting flight data:", error)
    throw error
  }
}
