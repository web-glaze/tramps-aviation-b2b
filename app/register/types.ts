/**
 * Type definitions for B2B registration flow
 */

export type Step = "form" | "success";

export interface RegisterFormState {
  agencyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  alternatePhone: string;
  password: string;
  confirmPassword: string;
  city: string;
  state: string;
  pincode: string;
  address: string;
  gstNumber: string;
  panNumber: string;
}
