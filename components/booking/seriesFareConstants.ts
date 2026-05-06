export const fmtINR = (n: number) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export const generateIdempotencyKey = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

// Indian airport IATA codes — used to decide if a sector is domestic. If
// either origin or destination is *not* in this list, the passenger
// passport block becomes required (international flight).
//
// Note: this is a frontend-only convenience set — the source of truth lives
// in `tramps-aviation-backend/src/modules/flights/data/airports.ts`. Add new
// codes here only when they're already deployed in the backend catalogue.
export const INDIAN_AIRPORTS = new Set([
  "DEL","BOM","BLR","MAA","CCU","HYD","COK","GOI","GOX","PNQ","AMD","JAI",
  "LKO","ATQ","TRV","IXC","BBI","IDR","NAG","PAT","GAU","IXR","IXB","SXR",
  "IXJ","DED","VNS","IXM","CJB","TRZ","IXE","VTZ","RPR","BHO","UDR","JDH",
  "IXU","STV","BDQ","RAJ",
]);

export const isIntlSector = (origin: string, destination: string) =>
  !INDIAN_AIRPORTS.has((origin || "").toUpperCase()) ||
  !INDIAN_AIRPORTS.has((destination || "").toUpperCase());
