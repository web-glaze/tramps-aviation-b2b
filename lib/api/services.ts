import apiClient, { publicApiClient } from "./client";

// ─── Helpers ──────────────────────────────────────────────────────────────────
export const unwrap = (res: any) => res?.data?.data ?? res?.data ?? res;

/**
 * Build an axios config for a "soft-auth" public request.
 *
 * The backend `/search/*`, `/flights/*`, `/hotels/*`, `/insurance/*` endpoints
 * are `@Public()` — they don't *require* a token. But when an agent IS logged
 * in we want to forward their JWT so the backend can attach per-agent
 * commission to each result.
 *
 * Using `publicApiClient` (no request/response interceptors) keeps anonymous
 * visitors safe from session-expiry redirects, while still attaching the
 * token when one exists.
 */
const softAuthHeaders = (): { headers?: { Authorization: string } } => {
  if (typeof window === "undefined") return {};
  const token =
    localStorage.getItem("auth_token") ||
    localStorage.getItem("agent_token");
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};
export const extractToken = (res: any): string => {
  const d = unwrap(res);
  return d?.access_token || d?.token || "";
};
export const extractAgent = (res: any) => {
  const d = unwrap(res);
  return d?.agent || d;
};
export const extractUser = (res: any) => {
  const d = unwrap(res);
  return d?.user || d;
};

const toHHMM = (v?: string) => {
  if (!v) return "";
  if (v.includes("T")) return v.split("T")[1].slice(0, 5);
  if (v.includes(":")) return v.slice(0, 5);
  return v;
};

// ═════════════════════════════════════════════════════════════════════════════
// AUTH — always real API
// ═════════════════════════════════════════════════════════════════════════════
export const authApi = {
  registerAgent: (data: any) => apiClient.post("/agents/register", data),
  loginAgent: (data: { identifier: string; password: string }) =>
    apiClient.post("/agents/login", data),
  forgotPassword: (data: any) =>
    apiClient.post("/agents/forgot-password", data),
  resetPassword: (data: any) => apiClient.post("/agents/reset-password", data),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    apiClient.post("/agents/change-password", data),
  registerCustomer: (data: any) =>
    apiClient.post("/auth/customer/register", data),
  loginCustomer: (data: { email: string; password: string }) =>
    apiClient.post("/auth/customer/login", data),
  sendOtp: (phoneNumber: string) =>
    apiClient.post("/auth/otp/send", { phoneNumber, provider: "sms" }),
  verifyOtp: (phoneNumber: string, otp: string) =>
    apiClient.post("/auth/otp/verify", { phoneNumber, otp }),
  resendOtp: (phoneNumber: string) =>
    apiClient.post("/auth/otp/resend", { phoneNumber, provider: "sms" }),
  me: () => apiClient.get("/auth/me"),
};
// B2C aliases
(authApi as any).loginWithEmail = (email: string, password: string) =>
  authApi.loginCustomer({ email, password });
(authApi as any).loginWithOtp = (phone: string, otp: string) =>
  authApi.verifyOtp(phone, otp);

// ═════════════════════════════════════════════════════════════════════════════
// AGENT (B2B) — always real API
// ═════════════════════════════════════════════════════════════════════════════
export const agentApi = {
  getProfile: () => apiClient.get("/agents/profile"),
  updateProfile: (d: any) => apiClient.put("/agents/profile", d),
  getKycStatus: () => apiClient.get("/agents/kyc/status"),
  submitKyc: (data: any) => apiClient.post("/kyc/submit", data),
  uploadKycDocument: (docType: string, file: File) => {
    const fd = new FormData();
    fd.append("document", file);
    fd.append("docType", docType);
    return apiClient.post("/agents/kyc/upload", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  getWallet: () => apiClient.get("/agents/wallet/balance"),
  getWalletTransactions: (p?: any) =>
    apiClient.get("/agents/wallet/transactions", { params: p }),
  getBookings: (p?: any) => apiClient.get("/bookings/my", { params: p }),
  getBookingById: (id: string) => apiClient.get(`/bookings/${id}`),
  // Backend route: POST /bookings/:bookingRef/cancel (NOT PATCH).
  // Pass the *bookingRef* (e.g. "TAHP20260504-Z64QRT"), not the Mongo _id —
  // the controller scopes the lookup to the agent via `req.user.sub` for us.
  cancelBooking: (bookingRef: string, reason?: string) =>
    apiClient.post(`/bookings/${bookingRef}/cancel`, { reason }),
  // Resend the booking confirmation e-ticket. `to` is optional — when
  // provided the email goes to that address instead of the booking's
  // saved contact email (useful when the original was wrong).
  resendBookingEmail: (bookingRef: string, to?: string) =>
    apiClient.post(`/bookings/${bookingRef}/resend-email`, to ? { to } : {}),
  // ── Booking: 2-step flow ──────────────────────────────────────────────────
  // Step 1: init booking (works for TBO live, Series/Custom fares, Mock)
  // The optional second arg is forwarded as the X-Idempotency-Key header so
  // network-retried calls dedupe on the backend instead of creating duplicates.
  initBooking: (data: any, idempotencyKey?: string) =>
    apiClient.post(
      "/bookings/init",
      data,
      idempotencyKey
        ? { headers: { "X-Idempotency-Key": idempotencyKey } }
        : undefined,
    ),
  // Step 2: confirm via wallet deduction (B2B only)
  confirmB2bBooking: (bookingRef: string) =>
    apiClient.post(`/bookings/${bookingRef}/confirm-b2b`, {}),
  // Step 2 (alt): pay via Razorpay — create order, then verify
  createBookingPaymentOrder: (bookingRef: string) =>
    apiClient.post(`/bookings/${bookingRef}/payment-order`, {}),
  verifyBookingPayment: (
    bookingRef: string,
    payload: {
      razorpayOrderId:   string;
      razorpayPaymentId: string;
      razorpaySignature: string;
    },
  ) => apiClient.post(`/bookings/${bookingRef}/verify-payment`, payload),
  // Legacy — kept for backwards compatibility, points to OLD single-step endpoint
  // Use initBooking + confirmB2bBooking instead for all new code
  bookFlight: (data: any) => {
    // Pre-fix: idempotency key was `Date.now() + Math.random().toString(36)`,
    // which has measurable collision risk on rapid retries (same ms + same
    // random bucket on a poor PRNG). Use crypto.randomUUID where available —
    // a true v4 UUID with negligible collision probability.
    const idempotencyKey =
      data._idempotencyKey ||
      (typeof crypto !== "undefined" &&
      typeof (crypto as any).randomUUID === "function"
        ? (crypto as any).randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
    const { _idempotencyKey: _removed, ...payload } = data;
    return apiClient.post("/bookings/agent/flight", payload, {
      headers: { "X-Idempotency-Key": idempotencyKey },
    });
  },
  // Topup request — manual bank/UPI flow. Admin reviews UTR + credits.
  requestTopup: (data: { amount: number; utrNumber?: string; note?: string }) =>
    apiClient.post("/agents/wallet/topup-request", data),
  // Topup via Razorpay — self-serve. Two-step: create order → verify.
  createTopupOrder: (amount: number) =>
    apiClient.post("/agents/wallet/topup-order", { amount }),
  verifyTopupPayment: (payload: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }) => apiClient.post("/agents/wallet/topup-verify", payload),
  // ── Sub-Agent management ──────────────────────────────────────────────────
  getSubAgents: () => apiClient.get("/agents/subagents"),
  createSubAgent: (data: { name: string; email: string; phone?: string; password: string }) =>
    apiClient.post("/agents/subagents", data),
  updateSubAgentStatus: (id: string, status: "active" | "inactive") =>
    apiClient.patch(`/agents/subagents/${id}/status`, { status }),
  getSubAgentBookings: (id: string, params?: any) =>
    apiClient.get(`/agents/subagents/${id}/bookings`, { params }),
  // ── Markup ────────────────────────────────────────────────────────────────
  saveMarkupRule: (data: { serviceType: string; type: "flat" | "percent"; value: number }) =>
    apiClient.post("/agents/markup-rules", data),
  getMarkupRules: () => apiClient.get("/agents/markup-rules"),
  // ── KYC: get signed download URL ─────────────────────────────────────────
  getKycDocumentUrl: (docType: string) =>
    apiClient.get(`/agents/kyc/document-url`, { params: { docType } }),
  getDashboard: () => apiClient.get("/agents/dashboard"),
  // Commission data lives inside bookings — fetch all bookings and aggregate client-side
  // Endpoint: GET /bookings/my?limit=200 (returns { bookings, pagination })
  getCommissions: (p?: any) =>
    apiClient.get("/bookings/my", {
      params: { limit: 200, ...p },
    }),
  // Wallet statement = wallet transactions with full pagination
  getWalletStatement: (p?: any) =>
    apiClient.get("/agents/wallet/transactions", { params: p }),
};

// ═════════════════════════════════════════════════════════════════════════════
// CUSTOMER (B2C) — always real API
// ═════════════════════════════════════════════════════════════════════════════
export const customerApi = {
  // Pre-fix: this was "/customer/profile" (singular) but the backend
  // controller is @Controller('customers') (plural) — every request
  // 404'd silently. Aligned to plural to match the actual route.
  getProfile: () => apiClient.get("/customers/profile"),
  getBookings: (p?: any) => apiClient.get("/bookings/my", { params: p }),
  // Same as agentApi.cancelBooking — backend uses POST + bookingRef.
  cancelBooking: (bookingRef: string, reason?: string) =>
    apiClient.post(`/bookings/${bookingRef}/cancel`, { reason }),
  requestRefund: (data: any) => apiClient.post("/refunds/request", data),
  getRefunds: () => apiClient.get("/refunds/my"),
  initiateBooking: async (data: any) => {
    const res = await apiClient.post(
      "/bookings/customer/flight/initiate",
      data,
    );
    const d = (res.data as any)?.data || res.data;
    if (d?.status === "confirmed" || d?.pnr) return res;
    return res;
  },
};

// ═════════════════════════════════════════════════════════════════════════════
// SEARCH — hits backend always
// Backend decides: TBO_USERNAME empty → DB mock data, set → real TBO
// Tramps Aviation Tickets always merged on top
// ═════════════════════════════════════════════════════════════════════════════
export const searchApi = {
  searchFlights: async (data: any) => {
    // Ensure all values are plain strings/numbers — never objects
    const toStr = (v: any) =>
      (typeof v === "string" ? v : String(v || "")).trim().toUpperCase();
    const payload = {
      origin: toStr(data.origin || data.from),
      destination: toStr(data.destination || data.to),
      departureDate: String(data.departureDate || data.date || "").trim(),
      adults: Number(data.adults || data.passengers || 1),
      children: Number(data.children || 0),
      infants: Number(data.infants || 0),
      cabinClass: String(data.cabinClass || "ECONOMY"),
      returnDate: data.returnDate ? String(data.returnDate) : undefined,
      tripType: data.tripType ? String(data.tripType) : "OneWay",
    };
    // Use publicApiClient — `/search/flights` is @Public on backend. The
    // soft-auth header forwards the agent's JWT only when present (so they
    // still get commission attached) without exposing anonymous visitors to
    // the auth-interceptor's session-expiry redirect logic.
    const res = await publicApiClient.post("/search/flights", payload, softAuthHeaders());
    const raw = res.data as any;
    const list = raw.flights || raw.results || raw.data?.flights || [];
    const flights = list.map((f: any) => ({
      ...f,
      flightKey: f.flightKey || f.resultToken || f.id,
      departureTime:
        f.departureTime ||
        (f.departure ? f.departure.split("T")[1]?.slice(0, 5) : ""),
      arrivalTime:
        f.arrivalTime ||
        (f.arrival ? f.arrival.split("T")[1]?.slice(0, 5) : ""),
      fare: {
        ...(f.fare || {}),
        baseFare: f.fare?.baseFare || 0,
        taxes: f.fare?.taxes || 0,
        totalFare: f.fare?.totalFare || f.fare?.total || f.price || 0,
        total: f.fare?.total || f.fare?.totalFare || f.price || 0,
        currency: f.fare?.currency || "INR",
      },
    }));
    return {
      data: {
        flights,
        totalCount: flights.length,
        source: raw.source || "API",
      },
    };
  },

  searchHotels: async (data: any) => {
    // Public endpoint — see softAuthHeaders comment above
    const res = await publicApiClient.get("/hotels/search", {
      params: data,
      ...softAuthHeaders(),
    });
    const raw = res.data as any;
    return {
      data: {
        hotels: raw.hotels || raw.results || raw.data?.hotels || [],
        totalCount: raw.totalCount || 0,
        source: raw.source || "API",
      },
    };
  },

  searchCities: (q: string) =>
    publicApiClient.get("/hotels/cities", { params: { q, limit: 10 } }),

  searchInsurance: async (data: any) => {
    // Public endpoint — anonymous visitors can browse plans
    const res = await publicApiClient.get("/insurance/plans", {
      params: data,
      ...softAuthHeaders(),
    });
    const raw = res.data as any;
    return { data: { plans: raw.plans || raw.data?.plans || raw.data || [] } };
  },

  issueInsurance: (data: any) => apiClient.post("/insurance/issue", data),

  revalidateFlight: (data: any) =>
    apiClient.post("/search/flights/revalidate", data),

  /** Search Tramps Aviation exclusive series fares (public endpoint) */
  searchSeriesFares: (params: {
    origin: string;
    destination: string;
    departureDate: string;
    adults?: number;
    tripType?: string;
    returnDate?: string;
  }) => publicApiClient.get("/flights/series", { params, ...softAuthHeaders() }),

  /**
   * Search airports for From/To autocomplete (public).
   * Pass `q` to filter, `limit` to cap results. No `q` returns top hubs.
   * Reused by Flights and Series Fare search bars.
   */
  searchAirports: (q: string, limit = 10) =>
    publicApiClient.get("/flights/airports", { params: { q, limit } }),
};

// ═════════════════════════════════════════════════════════════════════════════
// FLIGHTS — normalized for B2C/B2B pages
// ═════════════════════════════════════════════════════════════════════════════
export const flightsApi = {
  search: async (data: any) => {
    const res = await searchApi.searchFlights(data);
    const raw = res.data as any;
    const list = raw.flights || [];
    const flights = list.map((f: any) => {
      const depRaw = f.departureTime || f.departure || "";
      const arrRaw = f.arrivalTime || f.arrival || "";
      let dur = f.duration || "";
      if (typeof f.duration === "number") {
        const h = Math.floor(f.duration / 60),
          m = f.duration % 60;
        dur = `${h}h${m > 0 ? ` ${m}m` : ""}`;
      }
      const checkinBag =
        (typeof f.checkinBaggage === "string" ? f.checkinBaggage : "") ||
        (typeof f.checkInBaggage === "string" ? f.checkInBaggage : "") ||
        (typeof f.baggage === "string" ? f.baggage : "") ||
        (typeof f.baggageInfo?.checkIn === "string"
          ? f.baggageInfo.checkIn
          : "") ||
        "15 KG";
      const cabinBag =
        (typeof f.cabinBaggage === "string" ? f.cabinBaggage : "") ||
        (typeof f.baggageInfo?.cabin === "string" ? f.baggageInfo.cabin : "") ||
        "7 KG";
      return {
        ...f,
        id: f.id || f.flightKey || f.resultToken,
        resultToken: f.resultToken || f.flightKey || f.id,
        flightNo: f.flightNo || f.flightNumber,
        from: f.from || f.origin,
        to: f.to || f.destination,
        departure: toHHMM(depRaw),
        arrival: toHHMM(arrRaw),
        duration: dur,
        price: (() => {
          const p = f.price;
          if (typeof p === "number") return p;
          if (typeof p === "object" && p !== null)
            return p.total || p.grandTotal || p.perNight || 0;
          return (
            f.fare?.total ||
            f.fare?.totalFare ||
            f.fare?.TotalFare ||
            f.fare?.total ||
            0
          );
        })(),
        checkinBaggage: checkinBag,
        cabinBaggage: cabinBag,
        baggage: checkinBag,
        refundable: f.refundable ?? f.isRefundable ?? true,
        seatsAvailable: f.seatsAvailable || f.availableSeats || null,
        baggageInfo: undefined,
        amenities: undefined,
        stopDetails: undefined,
      };
    });
    return {
      data: { flights, totalCount: flights.length, source: raw.source },
    };
  },
  revalidate: (data: any) => searchApi.revalidateFlight(data),
};

// ═════════════════════════════════════════════════════════════════════════════
// HOTELS
// ═════════════════════════════════════════════════════════════════════════════
export const hotelsApi = {
  searchCities: async (query: string) => {
    try {
      return (
        await apiClient.get("/search/hotels/cities", { params: { q: query } })
      ).data;
    } catch {
      const CITIES = [
        "Delhi",
        "Mumbai",
        "Bangalore",
        "Chennai",
        "Kolkata",
        "Hyderabad",
        "Goa",
        "Jaipur",
        "Pune",
        "Ahmedabad",
        "Kochi",
        "Chandigarh",
      ];
      return CITIES.filter((c) =>
        c.toLowerCase().includes(query.toLowerCase()),
      ).map((c) => ({
        code: c.toUpperCase().slice(0, 3),
        name: c,
        country: "IN",
      }));
    }
  },
  search: async (data: any) => {
    const res = await searchApi.searchHotels(data);
    const raw = res.data as any;
    return {
      data: {
        hotels: (raw.hotels || []).map((h: any) => ({
          id: h.id || h.hotelId || h.resultToken,
          name: h.name || h.HotelName || "Hotel",
          city: h.city || h.City || data.cityCode || "",
          stars: h.stars || h.StarRating || 3,
          price: h.price?.grandTotal || h.price?.total || h.price || 0,
          pricePerNight: h.price?.perNight || h.pricePerNight || 0,
          rating: h.rating || "4.0",
          reviews: h.reviews || 0,
          amenities: Array.isArray(h.amenities) ? h.amenities : [],
          image: h.image || "🏨",
          resultToken: h.resultToken || h.id || h.hotelId,
          cancellation:
            h.cancellation || h.cancellationPolicy || "CHECK_POLICY",
          mealPlan: h.mealPlan || "ROOM_ONLY",
          nights: h.nights || data.nights || 1,
        })),
        totalCount: raw.totalCount || 0,
        source: raw.source,
      },
    };
  },
  getDetails: (code: string, params: any) =>
    apiClient.get(`/hotels/${code}`, { params }),
  book: (data: any) => apiClient.post("/hotels/book", data),
};

// ═════════════════════════════════════════════════════════════════════════════
// INSURANCE
// ═════════════════════════════════════════════════════════════════════════════
export const insuranceApi = {
  getPlans: (data: any) => searchApi.searchInsurance(data),
  buyPlan: (data: any) => apiClient.post("/insurance/buy", data),
  getMyPolicies: () => apiClient.get("/insurance/my-policies"),
};

// ═════════════════════════════════════════════════════════════════════════════
// PAYMENT
// ═════════════════════════════════════════════════════════════════════════════
export const paymentApi = {
  createOrder: (data: { bookingId: string; amount: number }) =>
    apiClient.post("/payment/create-order", data),
  verifyPayment: (data: any) => apiClient.post("/payment/verify", data),
};

// ═════════════════════════════════════════════════════════════════════════════
// LEGACY STUBS
// ═════════════════════════════════════════════════════════════════════════════
export const statsApi = { getStats: () => apiClient.get("/api/stats") };
export const usersApi = {
  getUsers: (p?: any) => apiClient.get("/api/users", { params: p }),
  getAll: (p?: any) => apiClient.get("/api/users", { params: p }),
  getUser: (id: string) => apiClient.get(`/api/users/${id}`),
  getById: (id: string) => apiClient.get(`/api/users/${id}`),
  create: (data: any) => apiClient.post("/api/users", data),
  update: (id: string, d: any) => apiClient.put(`/api/users/${id}`, d),
  updateUser: (id: string, d: any) => apiClient.put(`/api/users/${id}`, d),
  delete: (id: string) => apiClient.delete(`/api/users/${id}`),
  deleteUser: (id: string) => apiClient.delete(`/api/users/${id}`),
};

// ═════════════════════════════════════════════════════════════════════════════
// POPULAR CONTENT — Homepage sections (public, cached, fast)
// ═════════════════════════════════════════════════════════════════════════════
export const popularApi = {
  /** Single call returns all homepage content — flights, hotels, cities, countries */
  getHomepage: () => publicApiClient.get("/popular/homepage"),
  getFlights: () => publicApiClient.get("/popular/flights"),
  getHotels: () => publicApiClient.get("/popular/hotels"),
  getCities: () => publicApiClient.get("/popular/cities"),
  getCountries: () => publicApiClient.get("/popular/countries"),
};

// ═════════════════════════════════════════════════════════════════════════════
// REVIEWS — Submit & fetch reviews (both B2C customers and B2B agents)
// ═════════════════════════════════════════════════════════════════════════════
export const reviewApi = {
  /** Submit a review (auth required — works for both customer + agent) */
  submit: (data: {
    type: "flight" | "hotel";
    entityId: string;
    entityName: string;
    bookingRef: string;
    overallRating: number;
    serviceRating?: number;
    cleanlinessRating?: number;
    valueRating?: number;
    punctualityRating?: number;
    comment: string;
  }) => apiClient.post("/reviews", data),

  /** Get approved reviews for homepage / entity page */
  getPublic: (
    type: "flight" | "hotel",
    entityId: string,
    page = 1,
    limit = 10,
  ) =>
    apiClient.get(`/reviews/entity/${type}/${entityId}`, {
      params: { page, limit },
    }),

  /** Get all approved reviews for homepage testimonials */
  getHomepageReviews: (limit = 12) =>
    apiClient.get("/reviews/homepage", { params: { limit } }),

  /** Vote helpful */
  voteHelpful: (reviewId: string) =>
    apiClient.post(`/reviews/${reviewId}/helpful`),

  /** My reviews */
  getMyReviews: (page = 1) =>
    apiClient.get("/reviews/my", { params: { page } }),
};