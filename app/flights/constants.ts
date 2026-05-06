import type { CabinClass } from "./types";

// ═══════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════

export const POPULAR_AIRPORTS: Array<{ code: string; city: string; name: string; country: string }> = [
  { code: "DEL", city: "Delhi", name: "Indira Gandhi International", country: "India" },
  { code: "BOM", city: "Mumbai", name: "Chhatrapati Shivaji Maharaj International", country: "India" },
  { code: "BLR", city: "Bangalore", name: "Kempegowda International", country: "India" },
  { code: "MAA", city: "Chennai", name: "Chennai International", country: "India" },
  { code: "CCU", city: "Kolkata", name: "Netaji Subhas Chandra Bose International", country: "India" },
  { code: "HYD", city: "Hyderabad", name: "Rajiv Gandhi International", country: "India" },
  { code: "COK", city: "Kochi", name: "Cochin International", country: "India" },
  { code: "GOI", city: "Goa", name: "Goa International (Dabolim)", country: "India" },
  { code: "PNQ", city: "Pune", name: "Pune Airport", country: "India" },
  { code: "AMD", city: "Ahmedabad", name: "Sardar Vallabhbhai Patel International", country: "India" },
  { code: "JAI", city: "Jaipur", name: "Jaipur International", country: "India" },
  { code: "LKO", city: "Lucknow", name: "Chaudhary Charan Singh International", country: "India" },
  { code: "PAT", city: "Patna", name: "Jay Prakash Narayan Airport", country: "India" },
  { code: "BHO", city: "Bhopal", name: "Raja Bhoj Airport", country: "India" },
  { code: "VNS", city: "Varanasi", name: "Lal Bahadur Shastri International", country: "India" },
  { code: "IXC", city: "Chandigarh", name: "Chandigarh International", country: "India" },
  { code: "GAU", city: "Guwahati", name: "Lokpriya Gopinath Bordoloi International", country: "India" },
  { code: "BBI", city: "Bhubaneswar", name: "Biju Patnaik International", country: "India" },
  { code: "IDR", city: "Indore", name: "Devi Ahilyabai Holkar Airport", country: "India" },
  { code: "TRV", city: "Thiruvananthapuram", name: "Trivandrum International", country: "India" },
  { code: "STV", city: "Surat", name: "Surat Airport", country: "India" },
  { code: "NAG", city: "Nagpur", name: "Dr. Babasaheb Ambedkar International", country: "India" },
  { code: "RPR", city: "Raipur", name: "Swami Vivekananda Airport", country: "India" },
  { code: "ATQ", city: "Amritsar", name: "Sri Guru Ram Dass Jee International", country: "India" },
  { code: "DXB", city: "Dubai", name: "Dubai International", country: "UAE" },
  { code: "SIN", city: "Singapore", name: "Singapore Changi", country: "Singapore" },
  { code: "BKK", city: "Bangkok", name: "Suvarnabhumi Airport", country: "Thailand" },
  { code: "KUL", city: "Kuala Lumpur", name: "Kuala Lumpur International", country: "Malaysia" },
  { code: "LHR", city: "London", name: "London Heathrow", country: "UK" },
  { code: "JFK", city: "New York", name: "John F. Kennedy International", country: "USA" },
];

export const CABIN_LABELS: Record<CabinClass, string> = {
  ECONOMY: "Economy",
  PREMIUM_ECONOMY: "Premium Economy",
  BUSINESS: "Business",
  FIRST: "First Class",
};

export const STOP_LABELS: Record<number, string> = {
  0: "Non-stop",
  1: "1 Stop",
  2: "2+ Stops",
};
