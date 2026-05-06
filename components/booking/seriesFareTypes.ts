export interface SeriesFareForBooking {
  // The backend's `seriesFareToFlight` exposes the fare under both `id`
  // (string) and `_id` (Mongo ObjectId source). We accept either, plus the
  // pre-computed `resultToken` string the backend already includes — that
  // way callers don't have to worry about which field name carried through.
  _id?:         string;
  id?:          string;
  resultToken?: string;

  airline:      string;
  airlineCode?: string;

  // Backend actually uses `flightNumber`, but older code paths and the
  // page-level `SeriesFare` type used `flightNo`. Accept both to avoid
  // empty strings in the UI when one of them is missing.
  flightNo?:     string;
  flightNumber?: string;

  origin:       string;
  destination:  string;

  // Same dual-naming for departure/arrival times.
  departure?:     string;
  departureTime?: string;
  arrival?:       string;
  arrivalTime?:   string;

  duration?:    string;
  fare: {
    baseFare:  number;
    taxes:     number;
    totalFare: number;
    currency?: string;
  };
  agentCommission?: number;

  // Refund flag has been spelled both ways across the codebase.
  refundable?:   boolean;
  isRefundable?: boolean;

  cabinClass?:      string;

  // Same for seats remaining.
  seatsLeft?:      number;
  seatsAvailable?: number;
}

export interface Passenger {
  firstName:       string;
  lastName:        string;
  gender:          "M" | "F";
  dob:             string;  // YYYY-MM-DD
  // Passport fields — optional on domestic sectors, required on international.
  // The PNR for series fares is admin-supplied (popped from the admin pool
  // at confirm time), but the airline still needs passport data on the e-
  // ticket when the journey crosses an international border.
  passportNo?:     string;
  passportExpiry?: string;  // YYYY-MM-DD
  nationality?:    string;  // ISO-3166 alpha-2, defaults to "IN"
}

export interface Contact {
  email: string;
  phone: string;
}

export type Step = "passengers" | "review" | "confirming" | "success";

export interface BookingResult {
  bookingRef: string;
  pnr: string;
  status: string;
}
