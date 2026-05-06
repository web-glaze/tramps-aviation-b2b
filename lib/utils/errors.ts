/**
 * errors.ts — Centralised error handling utilities
 * Usage:  import { getErrorMessage, isNetworkError } from "@/lib/utils/errors"
 */

/** Extract a human-readable message from any thrown value */
export function getErrorMessage(err: unknown, fallback = "Something went wrong. Please try again."): string {
  if (!err) return fallback;

  if (typeof err === "string") return err || fallback;

  if (err instanceof Error) {
    // Axios / fetch error with server message
    const axiosMsg =
      (err as any)?.response?.data?.message ||
      (err as any)?.response?.data?.error;
    if (axiosMsg) return String(axiosMsg);
    return err.message || fallback;
  }

  if (typeof err === "object") {
    const o = err as any;
    const msg =
      o?.response?.data?.message ||
      o?.response?.data?.error ||
      o?.message ||
      o?.error;
    if (msg) return String(msg);
  }

  return fallback;
}

/** True if the request never reached the server (no internet, timeout, CORS) */
export function isNetworkError(err: unknown): boolean {
  if (err instanceof Error) {
    const code = (err as any)?.code;
    return (
      code === "ECONNABORTED" ||
      code === "ERR_NETWORK" ||
      code === "NETWORK_ERROR" ||
      err.message === "Network Error" ||
      !navigator.onLine
    );
  }
  return false;
}

/** True when the server returned HTTP 4xx/5xx */
export function isApiError(err: unknown): boolean {
  return !!(err as any)?.response?.status;
}

/** Get HTTP status code (0 if unavailable) */
export function getStatusCode(err: unknown): number {
  return Number((err as any)?.response?.status) || 0;
}

/** Pretty-print a validation error object like { field: "message" } */
export function formatValidationErrors(
  errors: Record<string, string | string[]>,
): string {
  return Object.entries(errors)
    .map(([, v]) => (Array.isArray(v) ? v[0] : v))
    .filter(Boolean)
    .join(" · ");
}
