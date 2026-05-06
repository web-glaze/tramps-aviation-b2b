"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/store";
import { authApi, extractToken, extractAgent } from "@/lib/api/services";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { RegisterFormState, Step } from "./types";
import { StepForm } from "./StepForm";
import { SuccessView } from "./SuccessView";
import { validateGst } from "./utils";

const INITIAL_FORM: RegisterFormState = {
  agencyName: "",
  contactPerson: "",
  email: "",
  phone: "",
  alternatePhone: "",
  password: "",
  confirmPassword: "",
  city: "",
  state: "",
  pincode: "",
  address: "",
  gstNumber: "",
  panNumber: "",
};

export default function B2BRegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [step, setStep] = useState<Step>("form");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [registeredAgentId, setRegisteredAgentId] = useState("");
  const [copiedId, setCopiedId] = useState(false);

  const [form, setForm] = useState<RegisterFormState>(INITIAL_FORM);

  const handleFormChange = (key: keyof RegisterFormState, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    // Each early-return must be `void` to match the typed Promise<void>
    // returned by this submit handler — that's why we don't `return` the
    // toast id (toast.error returns a string|number id).
    if (form.password !== form.confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    if (form.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (form.phone.replace(/\D/g, "").length < 10) {
      toast.error("Enter valid 10-digit mobile number");
      return;
    }

    // FIX: Validate GST format if provided
    if (form.gstNumber.trim()) {
      if (!validateGst(form.gstNumber)) {
        toast.error("Invalid GST number format. Example: 22AAAAA0000A1Z5");
        return;
      }
    }

    setLoading(true);
    try {
      const res = await authApi.registerAgent({
        agencyName: form.agencyName.trim(),
        contactPerson: form.contactPerson.trim(),
        email: form.email.toLowerCase().trim(),
        phone: form.phone.startsWith("+91")
          ? form.phone
          : `+91${form.phone.replace(/\D/g, "")}`,
        ...(form.alternatePhone
          ? { alternatePhone: `+91${form.alternatePhone.replace(/\D/g, "")}` }
          : {}),
        password: form.password,
        city: form.city.trim(),
        state: form.state,
        ...(form.pincode ? { pincode: form.pincode } : {}),
        ...(form.address?.trim() ? { address: form.address.trim() } : {}),
        gstNumber: form.gstNumber.trim()
          ? form.gstNumber.toUpperCase().trim()
          : undefined,
        panNumber: form.panNumber.trim()
          ? form.panNumber.toUpperCase().trim()
          : undefined,
      });

      const agentToken = extractToken(res);
      const agentData = extractAgent(res);

      if (!agentToken)
        throw new Error(
          "Registration succeeded but no token returned. Please login manually.",
        );

      localStorage.setItem("auth_token", agentToken);
      localStorage.setItem("agent_token", agentToken);
      document.cookie = `auth_token=${agentToken}; path=/; max-age=86400; SameSite=Lax`;

      setAuth(
        {
          id: agentData.id || agentData._id,
          name: agentData.contactPerson || agentData.agencyName,
          email: agentData.email,
          role: "agent",
          kycStatus: agentData.kycStatus || "pending",
          status: agentData.status || "inactive",
          agencyName: agentData.agencyName,
          walletBalance: 0,
        } as any,
        agentToken,
      );

      setRegisteredEmail(form.email);
      setRegisteredAgentId(agentData?.agentId || "");
      setStep("success");
      toast.success("Account created successfully!");
    } catch (err: any) {
      // FIX: Parse specific duplicate field errors from backend prefix codes
      const msg = err?.response?.data?.message || err.message || "";
      if (msg.includes("gst_duplicate")) {
        toast.error(
          "This GST number is already registered with another account. Please check and try again.",
          { duration: 6000 },
        );
      } else if (msg.includes("pan_duplicate")) {
        toast.error(
          "This PAN number is already registered with another account.",
          { duration: 6000 },
        );
      } else if (
        msg.includes("email_duplicate") ||
        (msg.toLowerCase().includes("email") &&
          msg.toLowerCase().includes("registered"))
      ) {
        toast.error("This email is already registered. Please login instead.", {
          duration: 6000,
        });
      } else if (
        msg.includes("phone_duplicate") ||
        (msg.toLowerCase().includes("phone") &&
          msg.toLowerCase().includes("registered"))
      ) {
        toast.error(
          "This phone number is already registered with another account.",
          { duration: 6000 },
        );
      } else if (msg.includes("duplicate::")) {
        // Generic duplicate with field name
        const fieldMsg =
          msg.split("duplicate::")[1] || "This value is already registered.";
        toast.error(fieldMsg, { duration: 6000 });
      } else {
        toast.error(msg || "Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (step === "success") {
    return (
      <>
        <Header />
        <SuccessView
          registeredEmail={registeredEmail}
          registeredAgentId={registeredAgentId}
          onCopyId={() => {
            navigator.clipboard.writeText(registeredAgentId);
            setCopiedId(true);
            setTimeout(() => setCopiedId(false), 2000);
          }}
          copiedId={copiedId}
        />
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <StepForm
        form={form}
        onFormChange={handleFormChange}
        onSubmit={handleSubmit}
        loading={loading}
        showPassword={showPassword}
        onToggleShowPassword={() => setShowPassword((s) => !s)}
      />
      <Footer />
    </>
  );
}
