"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { agentApi, unwrap } from "@/lib/api/services";
import { toast } from "sonner";
import { DOC_TYPES } from "./constants";
import { normalizeStatus, styles } from "./utils";
import { Logo } from "./Logo";
import { StepDetails } from "./StepDetails";
import { StepDocuments } from "./StepDocuments";
import { StatusView } from "./StatusView";
import { StepIndicator } from "./StepIndicator";
import { RejectionBanner } from "./RejectionBanner";
import type { Doc, DocType, KycForm, KycStatus, Step } from "./types";

export default function B2BKycPage() {
  const router = useRouter();
  const { isAuthenticated, user, token, _hasHydrated, setAuth } =
    useAuthStore();
  const hasFetched = useRef(false);

  const [kycStatus, setKycStatus] = useState<KycStatus>("pending");
  const [currentStep, setCurrentStep] = useState<Step>("details");
  const [rejectionReason, setRejectionReason] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [pageLoading, setPageLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState<DocType | null>(null);

  // Details form
  const [form, setForm] = useState<KycForm>({
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
      router.push("/login");
      return;
    }
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // ── Status screens (approved, under review, submitted)
  if (currentStep === "done") {
    return (
      <StatusView
        status={kycStatus}
        rejectionReason={rejectionReason}
        name={name}
        onRefresh={() => {
          hasFetched.current = false;
          fetchStatus();
        }}
        onApprovedDashboard={() => {
          if (user && token) {
            setAuth(
              { ...user, kycStatus: "approved", status: "active" },
              token,
            );
          }
          router.replace("/dashboard");
        }}
      />
    );
  }

  // ── Main flow (details + upload)
  return (
    <div style={styles.page}>
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
          <RejectionBanner reason={rejectionReason} />
        )}

        {/* Step bar */}
        <StepIndicator currentStep={currentStep} kycStatus={kycStatus} />

        {/* ── STEP 1: Details Form ────────────────────────────────── */}
        {currentStep === "details" && (
          <StepDetails
            form={form}
            onChange={(updates) => setForm((f) => ({ ...f, ...updates }))}
            onNext={handleDetailsNext}
          />
        )}

        {/* ── STEP 2: Document Upload ─────────────────────────────── */}
        {currentStep === "upload" && (
          <StepDocuments
            docs={docs}
            uploaded={uploaded}
            requiredDone={requiredDone}
            requiredTotal={requiredTotal}
            uploading={uploading}
            submitting={submitting}
            onUpload={handleUpload}
            onBack={() => setCurrentStep("details")}
            onSubmit={handleFinalSubmit}
          />
        )}
      </div>
    </div>
  );
}
