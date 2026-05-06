"use client";

import type { Passenger, PassengerType } from "./types";
import { Field } from "./Field";
import { inputCls, todayISO } from "./utils";
import { cn } from "@/lib/utils";

// ── Passenger form row ──────────────────────────────────────
export function PassengerForm({
  index, passenger, type, isIntl,
  onChange, errors,
}: {
  index: number;
  passenger: Passenger;
  type: PassengerType;
  isIntl: boolean;
  onChange: (p: Partial<Passenger>) => void;
  errors: Partial<Record<keyof Passenger, string>>;
}) {
  const typeLabels: Record<PassengerType, string> = {
    ADT: "Adult",
    CHD: "Child",
    INF: "Infant",
  };

  return (
    <div className="bg-muted/30 rounded-2xl p-4 sm:p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
          {index + 1}
        </div>
        <div>
          <p className="text-sm font-bold">{typeLabels[type]} {index + 1}</p>
          <p className="text-xs text-muted-foreground">
            {type === "CHD" ? "Age 2–11 years" : type === "INF" ? "Under 2 years" : "12+ years"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* First Name */}
        <Field label="First Name" required error={errors.firstName}>
          <input
            type="text"
            placeholder="As on passport/Aadhaar"
            value={passenger.firstName}
            onChange={e => onChange({ firstName: e.target.value.toUpperCase() })}
            className={inputCls(!!errors.firstName)}
          />
        </Field>

        {/* Last Name */}
        <Field label="Last Name" required error={errors.lastName}>
          <input
            type="text"
            placeholder="Surname"
            value={passenger.lastName}
            onChange={e => onChange({ lastName: e.target.value.toUpperCase() })}
            className={inputCls(!!errors.lastName)}
          />
        </Field>

        {/* Gender */}
        <Field label="Gender" required error={errors.gender}>
          <div className="flex gap-2 h-10">
            {([["M", "Male"], ["F", "Female"]] as const).map(([val, lbl]) => (
              <button
                key={val}
                type="button"
                onClick={() => onChange({ gender: val })}
                className={cn(
                  "flex-1 rounded-xl border-2 text-sm font-semibold transition-all",
                  passenger.gender === val
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40"
                )}
              >
                {lbl}
              </button>
            ))}
          </div>
        </Field>

        {/* Date of Birth */}
        <Field label="Date of Birth" required error={errors.dob}>
          <input
            type="date"
            value={passenger.dob}
            max={type === "INF"
              ? todayISO()
              : type === "CHD"
                ? new Date(Date.now() - 2 * 365 * 24 * 3600000).toISOString().split("T")[0]
                : new Date(Date.now() - 12 * 365 * 24 * 3600000).toISOString().split("T")[0]}
            onChange={e => onChange({ dob: e.target.value })}
            className={inputCls(!!errors.dob)}
          />
        </Field>

        {/* Passport fields for international */}
        {isIntl && (
          <>
            <Field label="Passport Number" required error={errors.passportNo}>
              <input
                type="text"
                placeholder="e.g. J1234567"
                value={passenger.passportNo || ""}
                onChange={e => onChange({ passportNo: e.target.value.toUpperCase() })}
                className={inputCls(!!errors.passportNo)}
              />
            </Field>
            <Field label="Passport Expiry" required error={errors.passportExpiry}>
              <input
                type="date"
                value={passenger.passportExpiry || ""}
                min={todayISO()}
                onChange={e => onChange({ passportExpiry: e.target.value })}
                className={inputCls(!!errors.passportExpiry)}
              />
            </Field>
          </>
        )}
      </div>
    </div>
  );
}
