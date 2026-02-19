const baseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || '/api').replace(/\/$/, '');

const getHeaders = (method: string): HeadersInit => {
  const headers: Record<string, string> = {
    "Accept": "application/json",
  };

  // Content-Type is only needed for requests with a body (POST, PUT, etc.)
  // Removing it for GET makes it a "simple request", avoiding CORS preflight (OPTIONS)
  if (method !== "GET" && method !== "HEAD") {
    headers["Content-Type"] = "application/json";
  }

  return headers;
};

async function fetchWithRetry(url: string, options: RequestInit, retries = 2): Promise<Response> {
  const method = options.method || "GET";
  try {
    // Merge default headers with provided headers
    options.headers = {
      ...getHeaders(method),
      ...options.headers,
    };

    return await fetch(url, options);
  } catch (error) {
    if (retries > 0 && error instanceof TypeError) {
      // Exponential backoff: 1s, 2s
      const delay = (3 - retries) * 1000;
      console.warn(`Fetch failed (CORS/Network), retrying in ${delay}ms... (${retries} left)`, error);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1);
    }
    throw error;
  }
}

export async function fetchHistoricalFlightData(
  flightNumber: string,
  carrierCode: string,
  fromDate: string,
  toDate: string,
  arrivalCode: string,
  departureCode: string,
  walletAddress?: string
) {
  try {
    let url = `${baseUrl}/v1/flights/fetch-historical/${flightNumber}/date-range?fromDate=${fromDate}&toDate=${toDate}&carrierCode=${carrierCode}&departureAirport=${departureCode}&arrivalAirport=${arrivalCode}`;

    if (walletAddress) {
      url += `&walletAddress=${walletAddress}`;
    }

    const response = await fetchWithRetry(
      url,
      {
        method: "GET",
      },
    );
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
}

export async function decryptFlightData(encryptedData: string[]) {
  try {
    const response = await fetchWithRetry(
      `${baseUrl}/v1/flights/decrypt-flight-data`,
      {
        method: "POST",
        body: JSON.stringify({
          encryptedData,
        }),
      }
    );
    if (!response.ok) {
      throw new Error(`Decryption API error: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    throw error;
  }
}

export async function searchFlightData(
  flightNumber: string,
  carrierCode: string
) {

  try {
    const response = await fetchWithRetry(
      `${baseUrl}/v1/flights/get-flight-status/${flightNumber}?carrier=${carrierCode}`,
      {
        method: "GET",
      },
    );
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
}
