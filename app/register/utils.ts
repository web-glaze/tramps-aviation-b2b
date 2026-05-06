/**
 * Validation utilities for registration form
 */

import { GST_REGEX, PASSWORD_MIN_LENGTH, PHONE_MIN_LENGTH } from "./constants";

/**
 * Validate GST number format
 * Checks pattern: 22AAAAA0000A1Z5
 */
export function validateGst(gst: string): boolean {
  if (!gst || !gst.trim()) return true; // optional field
  return GST_REGEX.test(gst.toUpperCase().trim());
}

/**
 * Validate phone number (10 digits)
 */
export function validatePhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, "");
  return cleaned.length >= PHONE_MIN_LENGTH;
}

/**
 * Validate password minimum length
 */
export function validatePassword(password: string): boolean {
  return password.length >= PASSWORD_MIN_LENGTH;
}

/**
 * Check if two passwords match
 */
export function validatePasswordMatch(
  password: string,
  confirmPassword: string,
): boolean {
  return password === confirmPassword;
}
