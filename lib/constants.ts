export const CONTRACT_ABI = [
  {
    inputs: [],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "string",
        name: "flightNumber",
        type: "string",
      },
      {
        indexed: false,
        internalType: "string",
        name: "scheduledDepartureDate",
        type: "string",
      },
      {
        indexed: false,
        internalType: "string",
        name: "carrierCode",
        type: "string",
      },
      {
        indexed: false,
        internalType: "string",
        name: "arrivalCity",
        type: "string",
      },
      {
        indexed: false,
        internalType: "string",
        name: "departureCity",
        type: "string",
      },
      {
        indexed: false,
        internalType: "string",
        name: "arrivalAirport",
        type: "string",
      },
      {
        indexed: false,
        internalType: "string",
        name: "departureAirport",
        type: "string",
      },
      {
        indexed: false,
        internalType: "string",
        name: "arrivalGate",
        type: "string",
      },
      {
        indexed: false,
        internalType: "string",
        name: "departureGate",
        type: "string",
      },
      {
        indexed: false,
        internalType: "string",
        name: "CurrentFlightStatus",
        type: "string",
      },
      {
        components: [
          {
            internalType: "string",
            name: "actualArrivalUTC",
            type: "string",
          },
          {
            internalType: "string",
            name: "actualDepartureUTC",
            type: "string",
          },
          {
            internalType: "string",
            name: "estimatedArrivalUTC",
            type: "string",
          },
          {
            internalType: "string",
            name: "estimatedDepartureUTC",
            type: "string",
          },
          {
            internalType: "string",
            name: "scheduledArrivalUTC",
            type: "string",
          },
          {
            internalType: "string",
            name: "scheduledDepartureUTC",
            type: "string",
          },
        ],
        indexed: false,
        internalType: "struct FlightStatusOracle.UTCTimeStruct",
        name: "utcTimes",
        type: "tuple",
      },
    ],
    name: "FlightDataSet",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "string",
        name: "flightNumber",
        type: "string",
      },
      {
        indexed: false,
        internalType: "string",
        name: "scheduledDepartureDate",
        type: "string",
      },
      {
        indexed: false,
        internalType: "string",
        name: "currentFlightStatusTime",
        type: "string",
      },
      {
        indexed: false,
        internalType: "string",
        name: "carrierCode",
        type: "string",
      },
      {
        indexed: false,
        internalType: "string",
        name: "FlightStatus",
        type: "string",
      },
      {
        indexed: false,
        internalType: "string",
        name: "ArrivalState",
        type: "string",
      },
      {
        indexed: false,
        internalType: "string",
        name: "DepartureState",
        type: "string",
      },
      {
        indexed: false,
        internalType: "string",
        name: "bagClaim",
        type: "string",
      },
      {
        indexed: false,
        internalType: "string",
        name: "FlightStatusCode",
        type: "string",
      },
    ],
    name: "FlightStatusUpdate",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "string",
        name: "flightNumber",
        type: "string",
      },
      {
        indexed: true,
        internalType: "address",
        name: "user",
        type: "address",
      },
      {
        indexed: false,
        internalType: "string",
        name: "carrierCode",
        type: "string",
      },
      {
        indexed: false,
        internalType: "string",
        name: "departureAirport",
        type: "string",
      },
      {
        indexed: false,
        internalType: "bool",
        name: "isSubscribe",
        type: "bool",
      },
    ],
    name: "SubscriptionDetails",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "user",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "numberOfFlightsUnsubscribed",
        type: "uint256",
      },
    ],
    name: "SubscriptionsRemoved",
    type: "event",
  },
]

export const CONTRACT_ADDRESS = "0x2Ff328B1B84a78aB61c41ca7D7c3302dD775fDAa"
export const WS_PROVIDER_URL = "wss://columbus.camino.network/ext/bc/C/ws"
