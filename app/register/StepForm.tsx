"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Building2,
  Eye,
  EyeOff,
  ArrowLeft,
  Info,
  MapPin,
  Lock,
  User,
  Loader2,
} from "lucide-react";
import { RegisterFormState } from "./types";
import { STATES, INPUT_CLASS, LABEL_CLASS, PASSWORD_MIN_LENGTH } from "./constants";

interface StepFormProps {
  form: RegisterFormState;
  onFormChange: (key: keyof RegisterFormState, value: string) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  loading: boolean;
  showPassword: boolean;
  onToggleShowPassword: () => void;
}

/**
 * Main registration form with all fields:
 * - Agency info (name, contact, email, phone)
 * - Business address (city, state, pincode, address)
 * - Business details (GST, PAN)
 * - Account password (password, confirm)
 *
 * FIX: GST/PAN validation comments from original code
 * FIX: Duplicate field error handling comments from original code
 */
export function StepForm({
  form,
  onFormChange,
  onSubmit,
  loading,
  showPassword,
  onToggleShowPassword,
}: StepFormProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header area with back link and logo */}
      <main className="flex-1 py-8 sm:py-12 px-4">
        <div style={{ maxWidth: "42rem", margin: "0 auto" }}>
          <div style={{ marginBottom: "1.5rem" }}>
            <Link
              href="/login"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.375rem",
                fontSize: "0.875rem",
                color: "hsl(var(--primary))",
                textDecoration: "none",
              }}
            >
              <ArrowLeft style={{ width: 16, height: 16 }} />
              <span style={{ color: "hsl(var(--muted-foreground))" }}>
                Already registered?
              </span>
              <span style={{ fontWeight: 700, color: "hsl(var(--primary))" }}>
                Login
              </span>
            </Link>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              marginBottom: "2rem",
            }}
          >
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
              <h1
                style={{
                  fontWeight: 700,
                  fontSize: "1.25rem",
                  color: "hsl(var(--foreground))",
                  margin: 0,
                }}
              >
                Tramps Aviation B2B
              </h1>
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "hsl(var(--muted-foreground))",
                  margin: 0,
                }}
              >
                Register your travel agency
              </p>
            </div>
          </div>

          <form
            onSubmit={onSubmit}
            style={{
              background: "hsl(var(--card))",
              border: "1px solid #1a2840",
              borderRadius: "1rem",
              padding: "1.75rem",
              display: "flex",
              flexDirection: "column",
              gap: "2rem",
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: "1.25rem",
                  fontWeight: 700,
                  color: "hsl(var(--foreground))",
                  margin: "0 0 0.25rem",
                }}
              >
                Create Agency Account
              </h2>
              <p
                style={{
                  color: "hsl(var(--muted-foreground))",
                  fontSize: "0.875rem",
                  margin: 0,
                }}
              >
                All fields marked * are required
              </p>
            </div>

            {/* Agency Info */}
            <section>
              <h3
                style={{
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: "hsl(var(--primary))",
                  marginBottom: "1rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <User style={{ width: 16, height: 16 }} /> Agency Information
              </h3>
              <div style={{ display: "grid", gap: "1rem" }}>
                <div>
                  <label className={LABEL_CLASS}>Agency / Company Name *</label>
                  <input
                    value={form.agencyName}
                    onChange={(e) => onFormChange("agencyName", e.target.value)}
                    required
                    placeholder="Sunshine Travel Agency"
                    className={INPUT_CLASS}
                  />
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "1rem",
                  }}
                >
                  <div>
                    <label className={LABEL_CLASS}>Contact Person *</label>
                    <input
                      value={form.contactPerson}
                      onChange={(e) =>
                        onFormChange("contactPerson", e.target.value)
                      }
                      required
                      placeholder="Rahul Sharma"
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Business Email *</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => onFormChange("email", e.target.value)}
                      required
                      placeholder="contact@agency.com"
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "1rem",
                  }}
                >
                  <div>
                    <label className={LABEL_CLASS}>Mobile Number *</label>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <span
                        style={{
                          background: "hsl(var(--background))",
                          border: "1px solid #1e293b",
                          borderRadius: "0.75rem",
                          padding: "0.75rem",
                          fontSize: "0.875rem",
                          color: "hsl(var(--muted-foreground))",
                          flexShrink: 0,
                        }}
                      >
                        +91
                      </span>
                      <input
                        value={form.phone}
                        onChange={(e) =>
                          onFormChange(
                            "phone",
                            e.target.value.replace(/\D/g, "").slice(0, 10),
                          )
                        }
                        required
                        placeholder="9876543210"
                        inputMode="numeric"
                        style={{
                          flex: 1,
                          background: "hsl(var(--background))",
                          border: "1px solid #1e293b",
                          borderRadius: "0.75rem",
                          padding: "0.75rem 1rem",
                          fontSize: "0.875rem",
                          color: "hsl(var(--foreground))",
                          outline: "none",
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Alternate Number</label>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <span
                        style={{
                          background: "hsl(var(--background))",
                          border: "1px solid #1e293b",
                          borderRadius: "0.75rem",
                          padding: "0.75rem",
                          fontSize: "0.875rem",
                          color: "hsl(var(--muted-foreground))",
                          flexShrink: 0,
                        }}
                      >
                        +91
                      </span>
                      <input
                        value={form.alternatePhone}
                        onChange={(e) =>
                          onFormChange(
                            "alternatePhone",
                            e.target.value.replace(/\D/g, "").slice(0, 10),
                          )
                        }
                        placeholder="Optional"
                        inputMode="numeric"
                        style={{
                          flex: 1,
                          background: "hsl(var(--background))",
                          border: "1px solid #1e293b",
                          borderRadius: "0.75rem",
                          padding: "0.75rem 1rem",
                          fontSize: "0.875rem",
                          color: "hsl(var(--foreground))",
                          outline: "none",
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Address */}
            <section>
              <h3
                style={{
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: "hsl(var(--primary))",
                  marginBottom: "1rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <MapPin style={{ width: 16, height: 16 }} /> Business Address
              </h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(min(100%, 200px), 1fr))",
                  gap: "1rem",
                }}
              >
                <div>
                  <label className={LABEL_CLASS}>City *</label>
                  <input
                    value={form.city}
                    onChange={(e) => onFormChange("city", e.target.value)}
                    required
                    placeholder="Mumbai"
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label className={LABEL_CLASS}>State *</label>
                  <select
                    value={form.state}
                    onChange={(e) => onFormChange("state", e.target.value)}
                    required
                    style={{
                      width: "100%",
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "0.75rem",
                      padding: "0.75rem 1rem",
                      fontSize: "0.875rem",
                      color: form.state
                        ? "hsl(var(--foreground))"
                        : "hsl(var(--muted-foreground))",
                      outline: "none",
                    }}
                  >
                    <option
                      value=""
                      style={{
                        background: "hsl(var(--card))",
                        color: "hsl(var(--muted-foreground))",
                      }}
                    >
                      Select State
                    </option>
                    {STATES.map((s) => (
                      <option
                        key={s}
                        value={s}
                        style={{
                          background: "hsl(var(--card))",
                          color: "hsl(var(--foreground))",
                        }}
                      >
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={LABEL_CLASS}>Pincode</label>
                  <input
                    value={form.pincode}
                    onChange={(e) =>
                      onFormChange(
                        "pincode",
                        e.target.value.replace(/\D/g, "").slice(0, 6),
                      )
                    }
                    placeholder="400001"
                    inputMode="numeric"
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label className={LABEL_CLASS}>Full Address</label>
                  <input
                    value={form.address}
                    onChange={(e) => onFormChange("address", e.target.value)}
                    placeholder="Shop 12, ABC Building"
                    className={INPUT_CLASS}
                  />
                </div>
              </div>
            </section>

            {/* Business Docs */}
            <section>
              <h3
                style={{
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: "hsl(var(--primary))",
                  marginBottom: "0.5rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <Building2 style={{ width: 16, height: 16 }} /> Business Details
              </h3>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  fontSize: "0.75rem",
                  color: "#f59e0b",
                  background: "rgba(245,158,11,0.08)",
                  border: "1px solid rgba(245,158,11,0.2)",
                  borderRadius: "0.5rem",
                  padding: "0.5rem 0.75rem",
                  marginBottom: "1rem",
                }}
              >
                <Info style={{ width: 12, height: 12, flexShrink: 0 }} />
                Optional — leave blank if you don&apos;t have GST/PAN yet. Upload
                actual documents in KYC section after registration.
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(min(100%, 200px), 1fr))",
                  gap: "1rem",
                }}
              >
                <div>
                  <label className={LABEL_CLASS}>GST Number</label>
                  <input
                    value={form.gstNumber}
                    onChange={(e) =>
                      onFormChange("gstNumber", e.target.value.toUpperCase())
                    }
                    placeholder="22AAAAA0000A1Z5 (optional)"
                    maxLength={15}
                    className={INPUT_CLASS}
                    style={{
                      borderColor:
                        form.gstNumber &&
                        !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
                          form.gstNumber,
                        )
                          ? "#f59e0b"
                          : "",
                    }}
                  />
                  {form.gstNumber &&
                    !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
                      form.gstNumber,
                    ) && (
                      <p
                        style={{
                          color: "#f59e0b",
                          fontSize: "0.7rem",
                          marginTop: "0.25rem",
                        }}
                      >
                        ⚠ Format: 22AAAAA0000A1Z5
                      </p>
                    )}
                </div>
                <div>
                  <label className={LABEL_CLASS}>PAN Number</label>
                  <input
                    value={form.panNumber}
                    onChange={(e) =>
                      onFormChange("panNumber", e.target.value.toUpperCase())
                    }
                    placeholder="ABCDE1234F (optional)"
                    maxLength={10}
                    className={INPUT_CLASS}
                  />
                </div>
              </div>
            </section>

            {/* Password */}
            <section>
              <h3
                style={{
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: "hsl(var(--primary))",
                  marginBottom: "1rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <Lock style={{ width: 16, height: 16 }} /> Account Password
              </h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(min(100%, 200px), 1fr))",
                  gap: "1rem",
                }}
              >
                <div>
                  <label className={LABEL_CLASS}>Password *</label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(e) =>
                        onFormChange("password", e.target.value)
                      }
                      required
                      minLength={PASSWORD_MIN_LENGTH}
                      placeholder={`Min ${PASSWORD_MIN_LENGTH} characters`}
                      style={{
                        width: "100%",
                        background: "hsl(var(--background))",
                        border: "1px solid #1e293b",
                        borderRadius: "0.75rem",
                        padding: "0.75rem 2.5rem 0.75rem 1rem",
                        fontSize: "0.875rem",
                        color: "hsl(var(--foreground))",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                    <button
                      type="button"
                      onClick={onToggleShowPassword}
                      style={{
                        position: "absolute",
                        right: "0.75rem",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        color: "hsl(var(--muted-foreground))",
                        cursor: "pointer",
                        padding: 0,
                      }}
                    >
                      {showPassword ? (
                        <EyeOff style={{ width: 16, height: 16 }} />
                      ) : (
                        <Eye style={{ width: 16, height: 16 }} />
                      )}
                    </button>
                  </div>
                  {form.password && form.password.length < PASSWORD_MIN_LENGTH && (
                    <p
                      style={{
                        color: "#f59e0b",
                        fontSize: "0.75rem",
                        marginTop: "0.25rem",
                      }}
                    >
                      ⚠ Min {PASSWORD_MIN_LENGTH} characters
                    </p>
                  )}
                </div>
                <div>
                  <label className={LABEL_CLASS}>Confirm Password *</label>
                  <input
                    type="password"
                    value={form.confirmPassword}
                    onChange={(e) =>
                      onFormChange("confirmPassword", e.target.value)
                    }
                    required
                    placeholder="Re-enter password"
                    style={{
                      width: "100%",
                      background: "hsl(var(--background))",
                      border: `1px solid ${form.confirmPassword && form.confirmPassword !== form.password ? "#ef4444" : "hsl(var(--border))"}`,
                      borderRadius: "0.75rem",
                      padding: "0.75rem 1rem",
                      fontSize: "0.875rem",
                      color: "hsl(var(--foreground))",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                  {form.confirmPassword &&
                    form.confirmPassword !== form.password && (
                      <p
                        style={{
                          color: "#f87171",
                          fontSize: "0.75rem",
                          marginTop: "0.25rem",
                        }}
                      >
                        ❌ Passwords don&apos;t match
                      </p>
                    )}
                  {form.confirmPassword &&
                    form.confirmPassword === form.password &&
                    form.password.length >= PASSWORD_MIN_LENGTH && (
                      <p
                        style={{
                          color: "#4ade80",
                          fontSize: "0.75rem",
                          marginTop: "0.25rem",
                        }}
                      >
                        ✅ Passwords match
                      </p>
                    )}
                </div>
              </div>
            </section>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                background: loading ? "#1d4ed8" : "hsl(var(--primary))",
                color: "hsl(var(--primary-foreground))",
                border: "none",
                borderRadius: "0.75rem",
                padding: "0.875rem",
                fontSize: "0.875rem",
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                opacity: loading ? 0.7 : 1,
                transition: "background 0.2s",
              }}
            >
              {loading ? (
                <>
                  <Loader2
                    style={{
                      width: 16,
                      height: 16,
                      animation: "spin 1s linear infinite",
                    }}
                  />{" "}
                  Creating Account...
                </>
              ) : (
                "Create Agency Account →"
              )}
            </button>
          </form>

          <p
            style={{
              textAlign: "center",
              fontSize: "0.875rem",
              color: "hsl(var(--muted-foreground))",
              marginTop: "1.5rem",
            }}
          >
            Already have an account?{" "}
            <Link
              href="/login"
              style={{
                color: "hsl(var(--primary))",
                textDecoration: "none",
                fontWeight: 500,
              }}
            >
              Sign in here
            </Link>
          </p>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      </main>
    </div>
  );
}
