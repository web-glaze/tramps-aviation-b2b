"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  Eye,
  RefreshCw,
  Loader2,
  BadgeCheck,
  Shield,
  Building2,
  FileText,
  ChevronRight,
  ChevronLeft,
  Info,
} from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { agentApi, unwrap } from "@/lib/api/services";
import { toast } from "sonner";
import Image from "next/image";

// ── Document types ────────────────────────────────────────────────────
const DOC_TYPES = [
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

type DocType = (typeof DOC_TYPES)[number]["type"];
type DocStatus =
  | "not_uploaded"
  | "uploading"
  | "pending"
  | "approved"
  | "rejected";
type KycStatus =
  | "pending"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected";
type Step = "details" | "upload" | "done";

interface Doc {
  type: DocType;
  status: DocStatus;
  url?: string;
  rejectionReason?: string;
}

function normalizeStatus(raw: string): KycStatus {
  if (!raw || raw === "inactive" || raw === "pending_kyc") return "pending";
  if (raw === "kyc_submitted" || raw === "submitted") return "submitted";
  if (raw === "under_review") return "under_review";
  if (raw === "active" || raw === "approved") return "approved";
  if (raw === "rejected") return "rejected";
  return "pending";
}

// ── Styles ────────────────────────────────────────────────────────────
const c = {
  page: {
    minHeight: "100vh",
    background: "hsl(var(--background))",
    padding: "2rem 1rem",
  } as React.CSSProperties,
  card: {
    background: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "0.875rem",
    padding: "1.25rem",
  } as React.CSSProperties,
  input: {
    width: "100%",
    background: "hsl(var(--background))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "0.75rem",
    padding: "0.7rem 1rem",
    fontSize: "0.875rem",
    color: "hsl(var(--foreground))",
    outline: "none",
    boxSizing: "border-box",
  } as React.CSSProperties,
  label: {
    fontSize: "0.78rem",
    color: "hsl(var(--muted-foreground))",
    fontWeight: 600,
    display: "block",
    marginBottom: "0.375rem",
  } as React.CSSProperties,
  primaryBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    width: "100%",
    background: "hsl(var(--primary))",
    color: "hsl(var(--foreground))",
    border: "none",
    borderRadius: "0.75rem",
    padding: "0.8rem",
    fontSize: "0.875rem",
    fontWeight: 600,
    cursor: "pointer",
  } as React.CSSProperties,
  outlineBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    width: "100%",
    background: "transparent",
    color: "hsl(var(--muted-foreground))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "0.75rem",
    padding: "0.8rem",
    fontSize: "0.875rem",
    fontWeight: 600,
    cursor: "pointer",
  } as React.CSSProperties,
  uploadBtn: (bg: string, disabled = false) =>
    ({
      display: "flex",
      alignItems: "center",
      gap: "0.375rem",
      padding: "0.5rem 0.875rem",
      borderRadius: "0.5rem",
      fontSize: "0.75rem",
      fontWeight: 600,
      cursor: disabled ? "not-allowed" : "pointer",
      border: "none",
      color: "hsl(var(--foreground))",
      background: bg,
      opacity: disabled ? 0.6 : 1,
      flexShrink: 0,
    }) as React.CSSProperties,
};

export default function B2BKycPage() {
  const router = useRouter();
  const { isAuthenticated, user, token, _hasHydrated, setAuth } =
    useAuthStore();
  const fileRefs = useRef<Partial<Record<DocType, HTMLInputElement | null>>>(
    {},
  );
  const hasFetched = useRef(false);

  const [kycStatus, setKycStatus] = useState<KycStatus>("pending");
  const [currentStep, setCurrentStep] = useState<Step>("details");
  const [rejectionReason, setRejectionReason] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [pageLoading, setPageLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState<DocType | null>(null);

  // Details form
  const [form, setForm] = useState({
    panNumber: "",
    aadharNumber: "",
    gstNumber: "",
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    accountHolder: "",
    accountType: "savings",
  });

  // File upload docs
  const [docs, setDocs] = useState<Record<DocType, Doc>>(() => {
    const init = {} as Record<DocType, Doc>;
    DOC_TYPES.forEach((d) => {
      init[d.type] = { type: d.type, status: "not_uploaded" };
    });
    return init;
  });

  // ── Auth guard ──────────────────────────────────────────────────
  useEffect(() => {
    if (!_hasHydrated) return;
    const localToken =
      typeof window !== "undefined"
        ? localStorage.getItem("auth_token") ||
          localStorage.getItem("agent_token")
        : null;
    if (!isAuthenticated && !localToken) {
      router.push("/b2b/login");
      return;
    }
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchStatus();
  }, [_hasHydrated, isAuthenticated]);

  // ── Fetch KYC status ────────────────────────────────────────────
  const fetchStatus = useCallback(async () => {
    setPageLoading(true);
    try {
      const res = await agentApi.getKycStatus();
      const data = unwrap(res) as any;
      const kyc = data?.kyc || data?.data || data;
      const raw =
        data?.kycStatus || kyc?.status || data?.agentStatus || "pending";
      const normalized = normalizeStatus(raw);
      setKycStatus(normalized);
      setRejectionReason(
        data?.kycRejectionReason || kyc?.rejectionReason || "",
      );
      setAgencyName(data?.agencyName || user?.agencyName || "");

      // FIX: sync kycStatus into auth store so layout.tsx allows dashboard access
      if (normalized === "approved" && user && token) {
        setAuth({ ...user, kycStatus: "approved", status: "active" }, token);
      }

      // Pre-fill form if data exists
      if (kyc?.panNumber) {
        setForm((f) => ({
          ...f,
          panNumber: kyc.panNumber || "",
          aadharNumber: kyc.aadharNumber || "",
          gstNumber: kyc.gstNumber || "",
          bankName: kyc.bankDetails?.bankName || "",
          accountNumber: kyc.bankDetails?.accountNumber || "",
          ifscCode: kyc.bankDetails?.ifscCode || "",
          accountHolder: kyc.bankDetails?.accountHolder || "",
          accountType: kyc.bankDetails?.accountType || "savings",
        }));
      }

      // Pre-fill uploaded docs
      const docList: any[] = data?.kycDocuments || kyc?.kycDocuments || [];
      if (docList.length > 0) {
        setDocs((prev) => {
          const updated = { ...prev };
          docList.forEach((d: any) => {
            if (updated[d.type as DocType]) {
              updated[d.type as DocType] = {
                type: d.type,
                url: d.s3Url || d.url,
                rejectionReason: d.rejectionReason,
                status:
                  d.status === "approved"
                    ? "approved"
                    : d.status === "rejected"
                      ? "rejected"
                      : "pending",
              };
            }
          });
          return updated;
        });
      }

      // Set step based on status
      if (
        normalized === "submitted" ||
        normalized === "under_review" ||
        normalized === "approved"
      ) {
        setCurrentStep("done");
      } else if (kyc?.panNumber) {
        setCurrentStep("upload"); // details already filled, go to upload
      } else {
        setCurrentStep("details");
      }
    } catch {
      setKycStatus("pending");
      setCurrentStep("details");
    } finally {
      setPageLoading(false);
    }
  }, [user]);

  // ── Submit text details ─────────────────────────────────────────
  const handleDetailsNext = () => {
    if (!form.panNumber) return toast.error("PAN number is required");
    if (!form.aadharNumber) return toast.error("Aadhaar number is required");
    if (form.panNumber.length !== 10)
      return toast.error("PAN must be exactly 10 characters");
    if (form.aadharNumber.replace(/\s/g, "").length !== 12)
      return toast.error("Aadhaar must be 12 digits");
    if (form.bankName && (!form.accountNumber || !form.ifscCode))
      return toast.error("Account number and IFSC required with bank name");
    if (form.ifscCode && form.ifscCode.length !== 11)
      return toast.error("IFSC must be 11 characters");
    setCurrentStep("upload");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Submit final KYC ────────────────────────────────────────────
  const handleFinalSubmit = async () => {
    const requiredDone = DOC_TYPES.filter(
      (d) => d.required && docs[d.type]?.status !== "not_uploaded",
    ).length;
    const requiredTotal = DOC_TYPES.filter((d) => d.required).length;
    if (requiredDone < requiredTotal) {
      toast.error(
        `Please upload all ${requiredTotal} required documents first`,
      );
      return;
    }
    setSubmitting(true);
    try {
      await agentApi.submitKyc({
        panNumber: form.panNumber.toUpperCase().trim(),
        aadharNumber: form.aadharNumber.replace(/\s/g, ""),
        ...(form.gstNumber && {
          gstNumber: form.gstNumber.toUpperCase().trim(),
        }),
        ...(form.bankName && {
          bankDetails: {
            bankName: form.bankName,
            accountNumber: form.accountNumber,
            ifscCode: form.ifscCode.toUpperCase(),
            accountHolder: form.accountHolder,
            accountType: form.accountType,
          },
        }),
      });
      toast.success("KYC submitted! We will review within 24–48 hours.");
      setKycStatus("submitted");
      setCurrentStep("done");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to submit KYC");
    } finally {
      setSubmitting(false);
    }
  };

  // ── File upload ─────────────────────────────────────────────────
  const handleUpload = async (docType: DocType, file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large (max 10MB)");
      return;
    }
    if (
      !["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(
        file.type,
      )
    ) {
      toast.error("Only JPG, PNG, WEBP or PDF allowed");
      return;
    }
    setUploading(docType);
    setDocs((prev) => ({
      ...prev,
      [docType]: { ...prev[docType], status: "uploading" },
    }));
    try {
      const res = await agentApi.uploadKycDocument(docType, file);
      const data = unwrap(res) as any;
      toast.success(
        `${DOC_TYPES.find((d) => d.type === docType)?.label} uploaded!`,
      );
      setDocs((prev) => ({
        ...prev,
        [docType]: {
          type: docType,
          status: "pending",
          url: data?.url || data?.s3Url,
        },
      }));
      if (data?.kycStatus) setKycStatus(normalizeStatus(data.kycStatus));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Upload failed");
      setDocs((prev) => ({
        ...prev,
        [docType]: { ...prev[docType], status: "not_uploaded" },
      }));
    } finally {
      setUploading(null);
    }
  };

  const uploaded = Object.values(docs).filter(
    (d) => d.status !== "not_uploaded",
  ).length;
  const requiredTotal = DOC_TYPES.filter((d) => d.required).length;
  const requiredDone = DOC_TYPES.filter(
    (d) => d.required && docs[d.type]?.status !== "not_uploaded",
  ).length;
  const name = agencyName || user?.agencyName || user?.name || "";

  // ── Loading ─────────────────────────────────────────────────────
  if (pageLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "hsl(var(--background))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <Loader2
            style={{
              width: 32,
              height: 32,
              color: "hsl(var(--primary))",
              margin: "0 auto 0.75rem",
              animation: "spin 1s linear infinite",
            }}
          />
          <p
            style={{
              color: "hsl(var(--muted-foreground))",
              fontSize: "0.875rem",
            }}
          >
            Loading KYC...
          </p>
        </div>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // SCREEN: APPROVED
  // ══════════════════════════════════════════════════════════════════
  if (kycStatus === "approved") {
    return (
      <div style={c.page}>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        <div
          style={{
            maxWidth: "30rem",
            margin: "3rem auto",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: "rgba(74,222,128,0.12)",
              border: "2px solid rgba(74,222,128,0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.5rem",
            }}
          >
            <BadgeCheck style={{ width: 40, height: 40, color: "#4ade80" }} />
          </div>
          <h1
            style={{
              fontSize: "1.75rem",
              fontWeight: 800,
              color: "hsl(var(--foreground))",
              margin: "0 0 0.5rem",
            }}
          >
            KYC Approved! 🎉
          </h1>
          {name && (
            <p
              style={{
                color: "hsl(var(--primary))",
                fontSize: "0.9rem",
                margin: "0 0 0.5rem",
                fontWeight: 500,
              }}
            >
              {name}
            </p>
          )}
          <p
            style={{
              color: "hsl(var(--muted-foreground))",
              fontSize: "0.875rem",
              margin: "0 0 2rem",
              lineHeight: 1.6,
            }}
          >
            Your KYC is verified. You can now book flights, hotels and earn
            commissions.
          </p>
          <button
            onClick={() => {
              if (user && token) {
                setAuth(
                  { ...user, kycStatus: "approved", status: "active" },
                  token,
                );
              }
              router.replace("/b2b/dashboard");
            }}
            style={{
              ...c.primaryBtn,
              background: "#16a34a",
              border: "none",
              cursor: "pointer",
            }}
          >
            <CheckCircle style={{ width: 18, height: 18 }} /> Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // SCREEN: UNDER REVIEW
  // ══════════════════════════════════════════════════════════════════
  if (
    currentStep === "done" &&
    (kycStatus === "submitted" || kycStatus === "under_review")
  ) {
    return (
      <div style={c.page}>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        <div style={{ maxWidth: "30rem", margin: "0 auto" }}>
          <Logo />
          <div
            style={{
              ...c.card,
              border: "1px solid rgba(96,165,250,0.3)",
              background: "rgba(96,165,250,0.04)",
              textAlign: "center",
              padding: "2rem 1.5rem",
              marginTop: "2rem",
            }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                background: "rgba(96,165,250,0.12)",
                border: "2px solid rgba(96,165,250,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1.25rem",
              }}
            >
              <Clock
                style={{ width: 36, height: 36, color: "hsl(var(--primary))" }}
              />
            </div>
            <h2
              style={{
                fontSize: "1.375rem",
                fontWeight: 700,
                color: "hsl(var(--foreground))",
                margin: "0 0 0.375rem",
              }}
            >
              Documents Under Review
            </h2>
            {name && (
              <p
                style={{
                  color: "hsl(var(--primary))",
                  fontSize: "0.875rem",
                  margin: "0 0 0.75rem",
                  fontWeight: 500,
                }}
              >
                {name}
              </p>
            )}
            <p
              style={{
                color: "hsl(var(--muted-foreground))",
                fontSize: "0.85rem",
                margin: "0 0 1.5rem",
                lineHeight: 1.7,
              }}
            >
              Your KYC documents have been submitted and are being reviewed.
              This usually takes{" "}
              <strong style={{ color: "hsl(var(--muted-foreground))" }}>
                24–48 business hours
              </strong>
              .
            </p>
            <div
              style={{
                textAlign: "left",
                background: "hsl(var(--background))",
                borderRadius: "0.75rem",
                padding: "0.875rem 1rem",
                marginBottom: "1.5rem",
              }}
            >
              {[
                { label: "Details Submitted", done: true },
                { label: "Documents Uploaded", done: true },
                { label: "Admin Review", done: false, active: true },
                { label: "Account Activated", done: false },
              ].map((step, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.45rem 0",
                    borderBottom:
                      i < 3 ? "1px solid hsl(var(--border))" : "none",
                  }}
                >
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: step.done
                        ? "#16a34a"
                        : step.active
                          ? "rgba(96,165,250,0.2)"
                          : "hsl(var(--border))",
                      border: step.active ? "2px solid #60a5fa" : "none",
                    }}
                  >
                    {step.done ? (
                      <CheckCircle
                        style={{
                          width: 12,
                          height: 12,
                          color: "hsl(var(--foreground))",
                        }}
                      />
                    ) : step.active ? (
                      <Clock
                        style={{
                          width: 11,
                          height: 11,
                          color: "hsl(var(--primary))",
                        }}
                      />
                    ) : (
                      <span
                        style={{
                          fontSize: "0.6rem",
                          color: "hsl(var(--muted-foreground))",
                          fontWeight: 600,
                        }}
                      >
                        {i + 1}
                      </span>
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: "0.8rem",
                      color: step.done
                        ? "#4ade80"
                        : step.active
                          ? "#60a5fa"
                          : "hsl(var(--muted-foreground))",
                      fontWeight: step.active ? 600 : 400,
                    }}
                  >
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
            <p
              style={{
                fontSize: "0.75rem",
                color: "hsl(var(--muted-foreground))",
                margin: "0 0 1.25rem",
              }}
            >
              📧 You will be notified by email once approved.
            </p>
            <button
              onClick={() => {
                hasFetched.current = false;
                fetchStatus();
              }}
              style={{
                ...c.outlineBtn,
                width: "auto",
                padding: "0.6rem 1.25rem",
                fontSize: "0.8rem",
                margin: "0 auto",
              }}
            >
              <RefreshCw style={{ width: 13, height: 13 }} /> Check Status
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // STEP INDICATOR (for details + upload steps)
  // ══════════════════════════════════════════════════════════════════
  const steps = [
    { key: "details", label: "Details", icon: Shield },
    { key: "upload", label: "Documents", icon: FileText },
  ];

  return (
    <div style={c.page}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}} input:focus{border-color:hsl(var(--primary)) !important;} select{background:hsl(var(--background));color:hsl(var(--foreground));}`}</style>
      <div style={{ maxWidth: "38rem", margin: "0 auto" }}>
        {/* Logo + Header */}
        <Logo />
        <div style={{ margin: "1.5rem 0 1.25rem" }}>
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 800,
              color: "hsl(var(--foreground))",
              margin: "0 0 0.25rem",
            }}
          >
            {kycStatus === "rejected" ? "Re-submit KYC" : "KYC Verification"}
          </h1>
          <p
            style={{
              color: "hsl(var(--muted-foreground))",
              fontSize: "0.875rem",
              margin: 0,
            }}
          >
            {name && (
              <>
                <span
                  style={{
                    color: "hsl(var(--muted-foreground))",
                    fontWeight: 500,
                  }}
                >
                  {name}
                </span>{" "}
                ·{" "}
              </>
            )}
            {kycStatus === "rejected"
              ? "Re-upload corrected documents to reactivate your account."
              : "Complete verification to activate your account and start booking."}
          </p>
        </div>

        {/* Rejection banner */}
        {kycStatus === "rejected" && (
          <div
            style={{
              border: "1px solid rgba(248,113,113,0.35)",
              background: "rgba(248,113,113,0.07)",
              borderRadius: "0.75rem",
              padding: "0.875rem 1rem",
              marginBottom: "1.25rem",
              display: "flex",
              alignItems: "flex-start",
              gap: "0.75rem",
            }}
          >
            <XCircle
              style={{
                width: 18,
                height: 18,
                color: "#f87171",
                flexShrink: 0,
                marginTop: 1,
              }}
            />
            <div>
              <p
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  color: "#f87171",
                  margin: "0 0 0.2rem",
                }}
              >
                KYC Rejected
              </p>
              <p style={{ fontSize: "0.8rem", color: "#fca5a5", margin: 0 }}>
                {rejectionReason ||
                  "Please re-upload clear, valid documents and resubmit."}
              </p>
            </div>
          </div>
        )}

        {/* Step bar */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
          {steps.map((s, i) => {
            const Icon = s.icon;
            const isActive = currentStep === s.key;
            const isDone = s.key === "details" && currentStep === "upload";
            return (
              <div
                key={s.key}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.625rem 0.875rem",
                  borderRadius: "0.75rem",
                  border: `1px solid ${isActive ? "rgba(59,130,246,0.5)" : isDone ? "rgba(74,222,128,0.3)" : "hsl(var(--border))"}`,
                  background: isActive
                    ? "rgba(59,130,246,0.08)"
                    : isDone
                      ? "rgba(74,222,128,0.06)"
                      : "transparent",
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: isActive
                      ? "#2563eb"
                      : isDone
                        ? "#16a34a"
                        : "hsl(var(--border))",
                    flexShrink: 0,
                  }}
                >
                  {isDone ? (
                    <CheckCircle
                      style={{
                        width: 14,
                        height: 14,
                        color: "hsl(var(--foreground))",
                      }}
                    />
                  ) : (
                    <Icon
                      style={{
                        width: 13,
                        height: 13,
                        color: isActive
                          ? "white"
                          : "hsl(var(--muted-foreground))",
                      }}
                    />
                  )}
                </div>
                <div>
                  <p
                    style={{
                      fontSize: "0.7rem",
                      color: "hsl(var(--muted-foreground))",
                      margin: 0,
                    }}
                  >
                    Step {i + 1}
                  </p>
                  <p
                    style={{
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      color: isActive
                        ? "white"
                        : isDone
                          ? "#4ade80"
                          : "hsl(var(--muted-foreground))",
                      margin: 0,
                    }}
                  >
                    {s.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── STEP 1: Details Form ────────────────────────────────── */}
        {currentStep === "details" && (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            {/* Identity */}
            <div style={c.card}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginBottom: "1rem",
                }}
              >
                <Shield
                  style={{
                    width: 16,
                    height: 16,
                    color: "hsl(var(--primary))",
                  }}
                />
                <span
                  style={{
                    fontSize: "0.9rem",
                    fontWeight: 700,
                    color: "hsl(var(--foreground))",
                  }}
                >
                  Identity Details
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.875rem",
                }}
              >
                <Field
                  label="PAN Number *"
                  placeholder="AAPFU0939F"
                  maxLength={10}
                  value={form.panNumber}
                  onChange={(v) =>
                    setForm((f) => ({ ...f, panNumber: v.toUpperCase() }))
                  }
                  hint="Format: AAAAA0000A (10 characters)"
                />
                <Field
                  label="Aadhaar Number *"
                  placeholder="1234 5678 9012"
                  maxLength={12}
                  type="tel"
                  value={form.aadharNumber}
                  onChange={(v) => setForm((f) => ({ ...f, aadharNumber: v }))}
                  hint="12-digit Aadhaar number"
                />
                <Field
                  label="GST Number (Optional)"
                  placeholder="27AAPFU0939F1ZV"
                  maxLength={15}
                  value={form.gstNumber}
                  onChange={(v) =>
                    setForm((f) => ({ ...f, gstNumber: v.toUpperCase() }))
                  }
                  hint="15-character GST registration number"
                />
              </div>
            </div>

            {/* Bank */}
            <div style={c.card}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginBottom: "0.5rem",
                }}
              >
                <Building2
                  style={{ width: 16, height: 16, color: "#a78bfa" }}
                />
                <span
                  style={{
                    fontSize: "0.9rem",
                    fontWeight: 700,
                    color: "hsl(var(--foreground))",
                  }}
                >
                  Bank Details
                </span>
                <span
                  style={{
                    fontSize: "0.7rem",
                    color: "hsl(var(--muted-foreground))",
                    marginLeft: "0.25rem",
                  }}
                >
                  (for commission payouts)
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.6rem 0.875rem",
                  background: "rgba(99,102,241,0.07)",
                  border: "1px solid rgba(99,102,241,0.2)",
                  borderRadius: "0.625rem",
                  marginBottom: "0.875rem",
                }}
              >
                <Info
                  style={{
                    width: 13,
                    height: 13,
                    color: "#818cf8",
                    flexShrink: 0,
                  }}
                />
                <p style={{ fontSize: "0.72rem", color: "#818cf8", margin: 0 }}>
                  Add IFSC and account number carefully — required for receiving
                  commissions.
                </p>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.875rem",
                }}
              >
                <Field
                  label="Bank Name"
                  placeholder="State Bank of India"
                  value={form.bankName}
                  onChange={(v) => setForm((f) => ({ ...f, bankName: v }))}
                />
                <Field
                  label="Account Holder Name"
                  placeholder="Rajesh Kumar"
                  value={form.accountHolder}
                  onChange={(v) => setForm((f) => ({ ...f, accountHolder: v }))}
                />
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "0.75rem",
                  }}
                >
                  <Field
                    label="Account Number"
                    placeholder="1234567890"
                    type="tel"
                    value={form.accountNumber}
                    onChange={(v) =>
                      setForm((f) => ({ ...f, accountNumber: v }))
                    }
                  />
                  <Field
                    label="IFSC Code"
                    placeholder="SBIN0001234"
                    maxLength={11}
                    value={form.ifscCode}
                    onChange={(v) =>
                      setForm((f) => ({ ...f, ifscCode: v.toUpperCase() }))
                    }
                    hint="11 characters"
                  />
                </div>
                <div>
                  <label style={c.label}>Account Type</label>
                  <select
                    value={form.accountType}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, accountType: e.target.value }))
                    }
                    style={{ ...c.input, appearance: "none" }}
                  >
                    <option value="savings">Savings Account</option>
                    <option value="current">Current Account</option>
                  </select>
                </div>
              </div>
            </div>

            <button onClick={handleDetailsNext} style={c.primaryBtn}>
              Continue to Document Upload{" "}
              <ChevronRight style={{ width: 16, height: 16 }} />
            </button>
          </div>
        )}

        {/* ── STEP 2: Document Upload ─────────────────────────────── */}
        {currentStep === "upload" && (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            {/* Progress bar */}
            <div style={c.card}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "0.5rem",
                }}
              >
                <span
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    color: "hsl(var(--foreground))",
                  }}
                >
                  Upload Progress
                </span>
                <span
                  style={{ fontSize: "0.8rem", color: "hsl(var(--primary))" }}
                >
                  {uploaded}/{DOC_TYPES.length} files
                </span>
              </div>
              <div
                style={{
                  width: "100%",
                  background: "hsl(var(--background))",
                  borderRadius: "999px",
                  height: 8,
                }}
              >
                <div
                  style={{
                    background:
                      requiredDone >= requiredTotal ? "#16a34a" : "#2563eb",
                    height: 8,
                    borderRadius: "999px",
                    width: `${(uploaded / DOC_TYPES.length) * 100}%`,
                    transition: "width 0.5s",
                  }}
                />
              </div>
              <p
                style={{
                  fontSize: "0.7rem",
                  color: "hsl(var(--muted-foreground))",
                  margin: "0.375rem 0 0",
                }}
              >
                {requiredDone}/{requiredTotal} required ·{" "}
                {DOC_TYPES.length - uploaded} remaining
              </p>
            </div>

            {/* Document cards */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.625rem",
              }}
            >
              {DOC_TYPES.map((doc) => {
                const d = docs[doc.type];
                const isUp = uploading === doc.type;
                const isApproved = d?.status === "approved";
                const isDocRej = d?.status === "rejected";
                const isPending = d?.status === "pending";
                const isNotUp = d?.status === "not_uploaded";
                const borderClr = isApproved
                  ? "rgba(74,222,128,0.35)"
                  : isDocRej
                    ? "rgba(248,113,113,0.35)"
                    : isPending
                      ? "rgba(96,165,250,0.25)"
                      : "hsl(var(--border))";
                const btnBg = isApproved
                  ? "rgba(74,222,128,0.15)"
                  : isUp
                    ? "hsl(var(--border))"
                    : isDocRej || isPending
                      ? "#92400e"
                      : "#2563eb";

                return (
                  <div
                    key={doc.type}
                    style={{
                      ...c.card,
                      border: `1px solid ${borderClr}`,
                      padding: "0.875rem 1rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "0.75rem",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            alignItems: "center",
                            gap: "0.375rem",
                            marginBottom: "0.2rem",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "0.875rem",
                              fontWeight: 600,
                              color: "hsl(var(--foreground))",
                            }}
                          >
                            {doc.label}
                          </span>
                          {doc.required && (
                            <Tag color="#f87171" bg="rgba(248,113,113,0.12)">
                              Required
                            </Tag>
                          )}
                          {isApproved && (
                            <Tag
                              color="#4ade80"
                              bg="rgba(74,222,128,0.12)"
                              icon={
                                <CheckCircle style={{ width: 9, height: 9 }} />
                              }
                            >
                              Approved
                            </Tag>
                          )}
                          {isDocRej && (
                            <Tag
                              color="#f87171"
                              bg="rgba(248,113,113,0.12)"
                              icon={<XCircle style={{ width: 9, height: 9 }} />}
                            >
                              Rejected
                            </Tag>
                          )}
                          {isPending && (
                            <Tag
                              color="#60a5fa"
                              bg="rgba(96,165,250,0.12)"
                              icon={<Clock style={{ width: 9, height: 9 }} />}
                            >
                              Under Review
                            </Tag>
                          )}
                          {isNotUp && (
                            <Tag
                              color="hsl(var(--muted-foreground))"
                              bg="transparent"
                            >
                              Not uploaded
                            </Tag>
                          )}
                        </div>
                        <p
                          style={{
                            fontSize: "0.72rem",
                            color: "hsl(var(--muted-foreground))",
                            margin: 0,
                          }}
                        >
                          {doc.desc}
                        </p>
                        {isDocRej && d?.rejectionReason && (
                          <p
                            style={{
                              fontSize: "0.72rem",
                              color: "#f87171",
                              margin: "0.2rem 0 0",
                            }}
                          >
                            ❌ {d.rejectionReason}
                          </p>
                        )}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          flexShrink: 0,
                        }}
                      >
                        {d?.url && (
                          <a
                            href={d.url}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              padding: "0.45rem",
                              background: "hsl(var(--background))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "0.5rem",
                              color: "hsl(var(--muted-foreground))",
                              display: "flex",
                            }}
                          >
                            <Eye style={{ width: 13, height: 13 }} />
                          </a>
                        )}
                        <button
                          onClick={() => fileRefs.current[doc.type]?.click()}
                          disabled={isUp || isApproved}
                          style={c.uploadBtn(btnBg, isUp || isApproved)}
                        >
                          {isUp ? (
                            <>
                              <Loader2
                                style={{
                                  width: 12,
                                  height: 12,
                                  animation: "spin 1s linear infinite",
                                }}
                              />{" "}
                              Uploading...
                            </>
                          ) : isApproved ? (
                            <>
                              <CheckCircle
                                style={{
                                  width: 12,
                                  height: 12,
                                  color: "#4ade80",
                                }}
                              />
                              <span style={{ color: "#4ade80" }}>Verified</span>
                            </>
                          ) : isPending || isDocRej ? (
                            <>
                              <Upload style={{ width: 12, height: 12 }} />{" "}
                              Re-upload
                            </>
                          ) : (
                            <>
                              <Upload style={{ width: 12, height: 12 }} />{" "}
                              Upload
                            </>
                          )}
                        </button>
                        <input
                          ref={(el) => {
                            fileRefs.current[doc.type] = el;
                          }}
                          type="file"
                          accept=".jpg,.jpeg,.png,.webp,.pdf"
                          style={{ display: "none" }}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleUpload(doc.type, f);
                            e.target.value = "";
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Accepted formats */}
            <div
              style={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.75rem",
                padding: "0.75rem 1rem",
              }}
            >
              <p
                style={{
                  fontSize: "0.72rem",
                  color: "hsl(var(--muted-foreground))",
                  margin: 0,
                }}
              >
                📋{" "}
                <strong style={{ color: "hsl(var(--muted-foreground))" }}>
                  Accepted:
                </strong>{" "}
                JPG, PNG, WEBP, PDF · Max 10MB per file · Ensure documents are
                clear and not expired
              </p>
            </div>

            {/* Submit / status */}
            {requiredDone >= requiredTotal ? (
              <div
                style={{
                  border: "1px solid rgba(74,222,128,0.3)",
                  background: "rgba(74,222,128,0.07)",
                  borderRadius: "0.75rem",
                  padding: "1rem 1.25rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    marginBottom: "0.625rem",
                  }}
                >
                  <CheckCircle
                    style={{ width: 16, height: 16, color: "#4ade80" }}
                  />
                  <p
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      color: "#4ade80",
                      margin: 0,
                    }}
                  >
                    All required documents uploaded!
                  </p>
                </div>
                <p
                  style={{
                    fontSize: "0.78rem",
                    color: "hsl(var(--muted-foreground))",
                    margin: "0 0 0.875rem",
                  }}
                >
                  Click submit to send your KYC for admin review. You'll be
                  notified by email within 24–48 hours.
                </p>
                <button
                  onClick={handleFinalSubmit}
                  disabled={submitting}
                  style={{
                    ...c.primaryBtn,
                    background: "#16a34a",
                    opacity: submitting ? 0.7 : 1,
                  }}
                >
                  {submitting ? (
                    <>
                      <Loader2
                        style={{
                          width: 16,
                          height: 16,
                          animation: "spin 1s linear infinite",
                        }}
                      />{" "}
                      Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircle style={{ width: 16, height: 16 }} /> Submit
                      KYC for Review
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div
                style={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.75rem",
                  padding: "0.875rem 1rem",
                }}
              >
                <p
                  style={{
                    fontSize: "0.78rem",
                    color: "hsl(var(--muted-foreground))",
                    margin: 0,
                  }}
                >
                  📌 Upload{" "}
                  <span style={{ color: "#f87171", fontWeight: 600 }}>
                    {requiredTotal - requiredDone} more required
                  </span>{" "}
                  document{requiredTotal - requiredDone > 1 ? "s" : ""} to
                  submit your KYC.
                </p>
              </div>
            )}

            <button
              onClick={() => setCurrentStep("details")}
              style={c.outlineBtn}
            >
              <ChevronLeft style={{ width: 15, height: 15 }} /> Back to Details
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────
function Logo() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
      <div className="h-11 w-11 rounded-xl overflow-hidden bg-white border border-border flex-shrink-0">
        <Image
          src="/logo.svg"
          alt="Tramps Aviation"
          width={44}
          height={44}
          className="h-11 w-11 object-contain"
        />
      </div>
      <div>
        <p
          style={{
            fontWeight: 700,
            color: "hsl(var(--foreground))",
            margin: 0,
            fontSize: "0.95rem",
          }}
        >
          Tramps Aviation B2B
        </p>
        <p
          style={{
            color: "hsl(var(--muted-foreground))",
            fontSize: "0.65rem",
            margin: 0,
          }}
        >
          Agent Portal · KYC Verification
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  type = "text",
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  type?: string;
  hint?: string;
}) {
  return (
    <div>
      <label
        style={{
          fontSize: "0.78rem",
          color: "hsl(var(--muted-foreground))",
          fontWeight: 600,
          display: "block",
          marginBottom: "0.375rem",
        }}
      >
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        style={{
          width: "100%",
          background: "hsl(var(--background))",
          border: "1px solid hsl(var(--border))",
          borderRadius: "0.75rem",
          padding: "0.7rem 1rem",
          fontSize: "0.875rem",
          color: "hsl(var(--foreground))",
          outline: "none",
          boxSizing: "border-box" as any,
        }}
      />
      {hint && (
        <p
          style={{
            fontSize: "0.7rem",
            color: "hsl(var(--muted-foreground))",
            margin: "0.25rem 0 0",
          }}
        >
          {hint}
        </p>
      )}
    </div>
  );
}

function Tag({
  color,
  bg,
  icon,
  children,
}: {
  color: string;
  bg: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span
      style={{
        fontSize: "0.65rem",
        color,
        background: bg,
        padding: "0.1rem 0.45rem",
        borderRadius: "999px",
        display: "flex",
        alignItems: "center",
        gap: "0.2rem",
      }}
    >
      {icon}
      {children}
    </span>
  );
}
