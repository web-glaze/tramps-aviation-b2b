// ─── Airport list (fallback when TBO airport API is unavailable) ──────────────
export const AIRPORTS = [
  { code: "DEL", city: "Delhi", name: "Indira Gandhi International" },
  { code: "BOM", city: "Mumbai", name: "Chhatrapati Shivaji Maharaj International" },
  { code: "BLR", city: "Bangalore", name: "Kempegowda International" },
  { code: "MAA", city: "Chennai", name: "Chennai International" },
  { code: "CCU", city: "Kolkata", name: "Netaji Subhas Chandra Bose International" },
  { code: "HYD", city: "Hyderabad", name: "Rajiv Gandhi International" },
  { code: "COK", city: "Kochi", name: "Cochin International" },
  { code: "GOI", city: "Goa", name: "Goa International" },
  { code: "PNQ", city: "Pune", name: "Pune Airport" },
  { code: "AMD", city: "Ahmedabad", name: "Sardar Vallabhbhai Patel International" },
  { code: "JAI", city: "Jaipur", name: "Jaipur International" },
  { code: "LKO", city: "Lucknow", name: "Chaudhary Charan Singh International" },
  { code: "ATQ", city: "Amritsar", name: "Sri Guru Ram Dass Jee International" },
  { code: "DXB", city: "Dubai", name: "Dubai International" },
  { code: "SIN", city: "Singapore", name: "Singapore Changi" },
  { code: "BKK", city: "Bangkok", name: "Suvarnabhumi Airport" },
  { code: "KUL", city: "Kuala Lumpur", name: "Kuala Lumpur International" },
  { code: "LHR", city: "London", name: "London Heathrow" },
  { code: "JFK", city: "New York", name: "John F. Kennedy International" },
  { code: "AUH", city: "Abu Dhabi", name: "Abu Dhabi International" },
  { code: "DOH", city: "Doha", name: "Hamad International" },
  { code: "KWI", city: "Kuwait", name: "Kuwait International" },
  { code: "MCT", city: "Muscat", name: "Muscat International" },
  { code: "RUH", city: "Riyadh", name: "King Khalid International" },
];

// ─── Airline initial badge — coloured square w/ 2-letter code ─────────────────
export const AIRLINE_BG: Record<string, string> = {
  IndiGo:    "bg-indigo-600",
  "Air India": "bg-red-600",
  SpiceJet:  "bg-orange-500",
  Vistara:   "bg-purple-600",
  GoFirst:   "bg-sky-500",
  AirAsia:   "bg-red-700",
};
