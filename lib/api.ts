const baseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || '/api').replace(/\/$/, '');

const getAuthHeaders = (): HeadersInit => {
  return {
    "Content-Type": "application/json",
  };
};

async function fetchWithRetry(url: string, options: RequestInit, retries = 1): Promise<Response> {
  try {
    // Simple fetch without auth logic
    options.headers = {
      ...getAuthHeaders(),
      ...options.headers,
    };
    const response = await fetch(url, options);
    return response;
  } catch (error) {
    if (retries > 0 && error instanceof TypeError) {
      console.warn(`Fetch failed, retrying... (${retries} left)`, error);
      await new Promise(resolve => setTimeout(resolve, 500));
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
) {
  try {
    const response = await fetchWithRetry(
      `${baseUrl}/v1/flights/fetch-historical/${flightNumber}/date-range?fromDate=${fromDate}&toDate=${toDate}&carrierCode=${carrierCode}&departureAirport=${departureCode}&arrivalAirport=${arrivalCode}`,
      {
        method: "GET",
        headers: getAuthHeaders(),
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
        headers: getAuthHeaders(),
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
        headers: getAuthHeaders(),
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
