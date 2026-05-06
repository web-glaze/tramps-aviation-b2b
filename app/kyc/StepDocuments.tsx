"use client";

import { useRef } from "react";
import {
  Upload,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  Loader2,
  ChevronLeft,
} from "lucide-react";
import { DOC_TYPES } from "./constants";
import { styles } from "./utils";
import { Tag } from "./Tag";
import type { Doc, DocType } from "./types";

interface StepDocumentsProps {
  docs: Record<DocType, Doc>;
  uploaded: number;
  requiredDone: number;
  requiredTotal: number;
  uploading: DocType | null;
  submitting: boolean;
  onUpload: (docType: DocType, file: File) => Promise<void>;
  onBack: () => void;
  onSubmit: () => Promise<void>;
}

export function StepDocuments({
  docs,
  uploaded,
  requiredDone,
  requiredTotal,
  uploading,
  submitting,
  onUpload,
  onBack,
  onSubmit,
}: StepDocumentsProps) {
  const fileRefs = useRef<Partial<Record<DocType, HTMLInputElement | null>>>({});

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Progress bar */}
      <div style={styles.card}>
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
                ...styles.card,
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
                    style={styles.uploadBtn(btnBg, isUp || isApproved)}
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
                        <Upload style={{ width: 12, height: 12 }} /> Re-upload
                      </>
                    ) : (
                      <>
                        <Upload style={{ width: 12, height: 12 }} /> Upload
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
                      if (f) onUpload(doc.type, f);
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
            Click submit to send your KYC for admin review. You&apos;ll be
            notified by email within 24–48 hours.
          </p>
          <button
            onClick={onSubmit}
            disabled={submitting}
            style={{
              ...styles.primaryBtn,
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
                <CheckCircle style={{ width: 16, height: 16 }} /> Submit KYC
                for Review
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
            document{requiredTotal - requiredDone > 1 ? "s" : ""} to submit
            your KYC.
          </p>
        </div>
      )}

      <button onClick={onBack} style={styles.outlineBtn}>
        <ChevronLeft style={{ width: 15, height: 15 }} /> Back to Details
      </button>
    </div>
  );
}
