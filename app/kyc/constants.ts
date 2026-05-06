import type { DocTypeConfig } from "./types";

export const DOC_TYPES: readonly DocTypeConfig[] = [
  {
    type: "pan",
    label: "PAN Card",
    required: true,
    desc: "Business or owner PAN card (JPG/PNG/PDF)",
  },
  {
    type: "gst",
    label: "GST Certificate",
    required: true,
    desc: "GST registration certificate",
  },
  {
    type: "aadhaar",
    label: "Aadhaar Card",
    required: false,
    desc: "Director/owner Aadhaar (front + back)",
  },
  {
    type: "trade_license",
    label: "Trade License",
    required: true,
    desc: "Trade license or business registration",
  },
  {
    type: "bank_statement",
    label: "Bank Statement",
    required: false,
    desc: "Last 3 months bank statement (PDF)",
  },
] as const;

export const STEP_LIST = [
  { key: "details", label: "Details" },
  { key: "upload", label: "Documents" },
] as const;
