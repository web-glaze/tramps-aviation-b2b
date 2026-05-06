"use client";

import { BadgeCheck, Mail, PhoneIcon, Sparkles, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Passenger, Contact } from "./seriesFareTypes";

export function PassengersStep({
  passengers, setPassengers, passengerErrors,
  contact, setContact, contactErrors,
  isIntl,
}: {
  passengers: Passenger[];
  setPassengers: React.Dispatch<React.SetStateAction<Passenger[]>>;
  passengerErrors: Partial<Passenger>[];
  contact: Contact;
  setContact: React.Dispatch<React.SetStateAction<Contact>>;
  contactErrors: Partial<Contact>;
  isIntl: boolean;
}) {
  const update = (i: number, patch: Partial<Passenger>) => {
    setPassengers((ps) => ps.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  };

  return (
    <div className="space-y-5">
      {/* International flight notice */}
      {isIntl && (
        <div className="rounded-xl p-3 border border-primary/30 bg-primary/5 text-xs text-primary flex items-start gap-2">
          <Sparkles className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
          <p>
            <strong>International sector</strong> — passport details are required
            for every passenger. Domestic sectors (within India) accept blank
            passport fields.
          </p>
        </div>
      )}

      {passengers.map((p, i) => (
        <div key={i} className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <UserIcon className="h-4 w-4 text-primary" />
            <p className="text-sm font-bold">Passenger {i + 1}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name" error={passengerErrors[i]?.firstName as string}>
              <input
                value={p.firstName}
                onChange={(e) => update(i, { firstName: e.target.value })}
                className="input"
                placeholder="As on Aadhaar / ID"
              />
            </Field>
            <Field label="Last name" error={passengerErrors[i]?.lastName as string}>
              <input
                value={p.lastName}
                onChange={(e) => update(i, { lastName: e.target.value })}
                className="input"
              />
            </Field>
            <Field label="Gender">
              <select
                value={p.gender}
                onChange={(e) => update(i, { gender: e.target.value as "M" | "F" })}
                className="input"
              >
                <option value="M">Male</option>
                <option value="F">Female</option>
              </select>
            </Field>
            <Field label="Date of birth" error={passengerErrors[i]?.dob as string}>
              <input
                type="date"
                value={p.dob}
                max={new Date().toISOString().split("T")[0]}
                onChange={(e) => update(i, { dob: e.target.value })}
                className="input"
              />
            </Field>
          </div>

          {/* Passport sub-section — required only for international sectors,
              but always shown so domestic agents can still fill it for
              corporate / ID-checked routes if they prefer. */}
          <details
            className="mt-1 group"
            open={isIntl}
          >
            <summary className="cursor-pointer flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground">
              <BadgeCheck className="h-3.5 w-3.5" />
              Passport details
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded-full border text-[9px] font-bold",
                  isIntl
                    ? "border-rose-500/40 text-rose-600 bg-rose-500/5"
                    : "border-border text-muted-foreground bg-muted/40",
                )}
              >
                {isIntl ? "Required" : "Optional"}
              </span>
              <span className="ml-auto text-[10px] text-muted-foreground group-open:hidden">click to expand</span>
            </summary>

            <div className="grid grid-cols-2 gap-3 mt-3">
              <Field
                label={`Passport number${isIntl ? "" : " (optional)"}`}
                error={passengerErrors[i]?.passportNo as string}
              >
                <input
                  value={p.passportNo || ""}
                  onChange={(e) => update(i, { passportNo: e.target.value.toUpperCase() })}
                  className="input"
                  placeholder="A1234567"
                  maxLength={12}
                />
              </Field>
              <Field
                label={`Passport expiry${isIntl ? "" : " (optional)"}`}
                error={passengerErrors[i]?.passportExpiry as string}
              >
                <input
                  type="date"
                  value={p.passportExpiry || ""}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => update(i, { passportExpiry: e.target.value })}
                  className="input"
                />
              </Field>
              <Field label="Nationality">
                <input
                  value={p.nationality || "IN"}
                  onChange={(e) => update(i, { nationality: e.target.value.toUpperCase().slice(0, 2) })}
                  className="input"
                  placeholder="IN"
                  maxLength={2}
                />
              </Field>
            </div>
          </details>
        </div>
      ))}

      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-primary" />
          <p className="text-sm font-bold">Contact for ticket / e-ticket</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Email" error={contactErrors.email}>
            <input
              type="email"
              value={contact.email}
              onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))}
              className="input"
              placeholder="agent@email.com"
            />
          </Field>
          <Field label="Phone" error={contactErrors.phone}>
            <div className="flex">
              <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-border bg-muted text-xs text-muted-foreground">
                +91
              </span>
              <input
                value={contact.phone}
                onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                className="input rounded-l-none"
                placeholder="9876543210"
                inputMode="numeric"
              />
            </div>
          </Field>
        </div>
      </div>

      <style jsx>{`
        .input {
          width: 100%;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          border: 1px solid hsl(var(--border));
          border-radius: 0.625rem;
          background: hsl(var(--background));
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .input:focus {
          border-color: hsl(var(--primary));
          box-shadow: 0 0 0 3px hsl(var(--primary) / 0.15);
        }
      `}</style>
    </div>
  );
}

function Field({
  label, error, children,
}: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </label>
      {children}
      {error && <p className="text-[11px] text-rose-600 font-medium">{error}</p>}
    </div>
  );
}
