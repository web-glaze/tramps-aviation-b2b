// ═══════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════

export type TripType = "OneWay" | "RoundTrip" | "MultiCity";

// Multi-city leg shape — used only when tripType === "MultiCity".
// Min 2 legs, max 4 (TBO/Amadeus practical cap).
export interface MultiCityLeg {
  from: string;
  fromLabel: string;
  to: string;
  toLabel: string;
  date: string; // YYYY-MM-DD
}

export type CabinClass = "ECONOMY" | "PREMIUM_ECONOMY" | "BUSINESS" | "FIRST";
export type PassengerType = "ADT" | "CHD" | "INF";
export type SortKey = "price" | "duration" | "departure" | "arrival";
export type BookStep = "passengers" | "review" | "confirming" | "success";

export interface SearchParams {
  origin: string;
  originLabel: string;
  destination: string;
  destinationLabel: string;
  departureDate: string;
  returnDate: string;
  adults: number;
  children: number;
  infants: number;
  cabinClass: CabinClass;
  tripType: TripType;
  /** Only populated when tripType === "MultiCity". 2–4 entries. */
  legs?: MultiCityLeg[];
  /** Filter: show only non-stop flights. */
  directOnly?: boolean;
  /** Filter: airline IATA code whitelist. Empty = all airlines. */
  airlines?: string[];
}

export interface Flight {
  id: string;
  resultToken: string;
  flightKey?: string;
  airline: string;
  airlineCode?: string;
  flightNo: string;
  from: string;
  to: string;
  departure: string;
  arrival: string;
  duration: string;
  stops: number;
  price: number;
  fare: {
    baseFare: number;
    taxes: number;
    totalFare: number;
    currency: string;
  };
  cabinClass: string;
  checkinBaggage: string;
  cabinBaggage: string;
  refundable: boolean;
  seatsAvailable?: number;
}

export interface Passenger {
  type: PassengerType;
  firstName: string;
  lastName: string;
  gender: "M" | "F";
  dob: string;
  passportNo?: string;
  passportExpiry?: string;
  nationality?: string;
}

export interface ContactInfo {
  email: string;
  phone: string;
  altPhone: string;
}
