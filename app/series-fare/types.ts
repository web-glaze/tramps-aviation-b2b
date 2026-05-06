// ─── Types ────────────────────────────────────────────────────────────────────

export interface SeriesFare {
  // Backend's `seriesFareToFlight` returns the row with `id` (string), and
  // sometimes `_id` carries through too. Always prefer `resultToken` when
  // sending the fare back to the booking endpoint — that string is already
  // `TRAMPS-<id>` and never mismatches.
  _id?: string;
  id?: string;
  resultToken?: string;
  airline: string;
  airlineCode?: string;
  flightNo: string;
  origin: string;
  destination: string;
  departure: string;
  arrival: string;
  duration: string;
  stops: number;
  fare: {
    baseFare: number;
    taxes: number;
    totalFare: number;
    currency?: string;
  };
  agentCommission?: number;
  commissionPercent?: number;
  checkinBaggage?: string;
  cabinBaggage?: string;
  refundable?: boolean;
  seatsLeft?: number;
  cabinClass?: string;
  validFrom?: string;
  validTill?: string;
  source?: string;
  // RoundTrip fields populated by backend when tripType=RoundTrip
  tripType?: "OneWay" | "RoundTrip";
  returnDate?: string;
  returnFlight?: {
    airline?: string;
    flightNo?: string;
    departure?: string;
    arrival?: string;
    duration?: string;
    stops?: number;
    price?: number;
    fare?: { totalFare?: number };
  } | null;
  combinedPrice?: number;
}

export interface SearchForm {
  origin: string;
  originLabel: string;
  destination: string;
  destinationLabel: string;
  departureDate: string;
  returnDate: string;
  tripType: "OneWay" | "RoundTrip";
  adults: number;
}
