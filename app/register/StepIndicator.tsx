"use client";

import { Step } from "./types";

interface StepIndicatorProps {
  currentStep: Step;
}

/**
 * Displays the current step indicator.
 * Current implementation is minimal — just shows/hides form vs success UI.
 * Kept as separate component for future multi-step stepper UI.
 */
export function StepIndicator({ currentStep }: StepIndicatorProps) {
  // Currently returns null since the step indicator is managed at the page level
  // by rendering different UIs in b2b-register.tsx
  return null;
}
