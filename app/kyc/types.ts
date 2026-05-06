// KYC form state and document types

export type DocType = "pan" | "gst" | "aadhaar" | "trade_license" | "bank_statement";

export type DocStatus =
  | "not_uploaded"
  | "uploading"
  | "pending"
  | "approved"
  | "rejected";

export type KycStatus =
  | "pending"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected";

export type Step = "details" | "upload" | "done";

export interface Doc {
  type: DocType;
  status: DocStatus;
  url?: string;
  rejectionReason?: string;
}

export interface KycForm {
  panNumber: string;
  aadharNumber: string;
  gstNumber: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  accountHolder: string;
  accountType: "savings" | "current";
}

export interface DocTypeConfig {
  type: DocType;
  label: string;
  required: boolean;
  desc: string;
}
