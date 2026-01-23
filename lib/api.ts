const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

const getAuthHeaders = (): HeadersInit => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

async function refreshToken(): Promise<void> {
  try {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    const response = await fetch(`${baseUrl}/v1/auth/refresh-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token: refreshToken }),
    });

    if (!response.ok) {
      throw new Error("Failed to refresh token");
    }

    const data = await response.json();
    // Update the tokens in localStorage
    localStorage.setItem("token", data.accessToken);
    if (data.refreshToken) {
      localStorage.setItem("refreshToken", data.refreshToken);
    }
  } catch (error) {
    console.error("Error refreshing token:", error);
    throw error;
  }
}

async function fetchWithRetry(url: string, options: RequestInit): Promise<Response> {
  // Make the initial request
  let response = await fetch(url, options);

  // If we get a 401, try to refresh the token and retry
  if (!response.ok && response.status === 403) {
    try {
      await refreshToken();
      // Update the headers with the new token
      options.headers = getAuthHeaders();
      response = await fetch(url, options);
    } catch (refreshError) {
      console.error("Error refreshing token:", refreshError);
      throw refreshError;
    }
  }

  return response;
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
