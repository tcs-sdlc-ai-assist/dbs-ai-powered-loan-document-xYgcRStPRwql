"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { z } from "zod";
import { applicationIntakeSchema } from "@/lib/validation-schemas";
import type { ApplicationIntakeInput } from "@/lib/validation-schemas";
import { LOAN_TYPES } from "@/lib/constants";
import type { ApiResponse } from "@/types/types";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface IntakeFormProps {
  /** Optional callback fired after successful submission */
  onSuccess?: (applicationId: string) => void;
  /** Optional class names for the form wrapper */
  className?: string;
}

interface FormErrors {
  applicantName?: string;
  loanType?: string;
  loanAmount?: string;
}

// ---------------------------------------------------------------------------
// Loan Type Options
// ---------------------------------------------------------------------------

const LOAN_TYPE_OPTIONS = LOAN_TYPES.map((type) => ({
  value: type,
  label: type,
}));

// ---------------------------------------------------------------------------
// IntakeForm Component
// ---------------------------------------------------------------------------

export default function IntakeForm({ onSuccess, className }: IntakeFormProps) {
  const router = useRouter();
  const { data: session } = useSession();

  // Form state
  const [applicantName, setApplicantName] = React.useState("");
  const [loanType, setLoanType] = React.useState("");
  const [loanAmount, setLoanAmount] = React.useState("");

  // UI state
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  const validateForm = (): boolean => {
    const formErrors: FormErrors = {};
    let isValid = true;

    // Parse loan amount to number for validation
    const parsedAmount = parseFloat(loanAmount);

    const result = applicationIntakeSchema.safeParse({
      applicantName: applicantName.trim(),
      loanType,
      loanAmount: isNaN(parsedAmount) ? 0 : parsedAmount,
    });

    if (!result.success) {
      isValid = false;

      for (const error of result.error.errors) {
        const field = error.path[0] as keyof FormErrors;
        if (field && !formErrors[field]) {
          formErrors[field] = error.message;
        }
      }
    }

    // Additional client-side checks
    if (!loanAmount || loanAmount.trim() === "") {
      formErrors.loanAmount = "Loan amount is required";
      isValid = false;
    } else if (isNaN(parsedAmount)) {
      formErrors.loanAmount = "Loan amount must be a valid number";
      isValid = false;
    }

    if (!loanType) {
      formErrors.loanType = "Loan type is required";
      isValid = false;
    }

    setErrors(formErrors);
    return isValid;
  };

  // ---------------------------------------------------------------------------
  // Submission
  // ---------------------------------------------------------------------------

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validateForm()) {
      return;
    }

    const parsedAmount = parseFloat(loanAmount);

    const payload: ApplicationIntakeInput = {
      applicantName: applicantName.trim(),
      loanType,
      loanAmount: parsedAmount,
    };

    setLoading(true);

    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data: ApiResponse<{ id: string; applicationId: string }> =
        await response.json();

      if (!response.ok || !data.success) {
        const errorMessage =
          data.error || `Failed to create application (${response.status})`;
        setSubmitError(errorMessage);
        return;
      }

      if (!data.data) {
        setSubmitError("Unexpected response: no application data returned");
        return;
      }

      const applicationId = data.data.applicationId || data.data.id;

      if (onSuccess) {
        onSuccess(applicationId);
      } else {
        router.push(`/applications/${applicationId}/applicant`);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "An unexpected error occurred";
      setSubmitError(message);
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Field Change Handlers
  // ---------------------------------------------------------------------------

  const handleApplicantNameChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setApplicantName(e.target.value);
    if (errors.applicantName) {
      setErrors((prev) => ({ ...prev, applicantName: undefined }));
    }
  };

  const handleLoanTypeChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setLoanType(e.target.value);
    if (errors.loanType) {
      setErrors((prev) => ({ ...prev, loanType: undefined }));
    }
  };

  const handleLoanAmountChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setLoanAmount(e.target.value);
    if (errors.loanAmount) {
      setErrors((prev) => ({ ...prev, loanAmount: undefined }));
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className={className}
    >
      {/* Submit Error */}
      {submitError && (
        <Alert
          variant="error"
          title="Submission Failed"
          dismissible
          onDismiss={() => setSubmitError(null)}
          className="mb-6"
        >
          {submitError}
        </Alert>
      )}

      <div className="space-y-5">
        {/* Applicant Name */}
        <Input
          label="Applicant Name"
          name="applicantName"
          type="text"
          placeholder="Enter applicant's full name"
          value={applicantName}
          onChange={handleApplicantNameChange}
          error={errors.applicantName}
          required
          disabled={loading}
        />

        {/* Loan Type */}
        <Select
          label="Loan Type"
          name="loanType"
          placeholder="Select a loan type"
          options={LOAN_TYPE_OPTIONS}
          value={loanType}
          onChange={handleLoanTypeChange}
          error={errors.loanType}
          required
          disabled={loading}
        />

        {/* Loan Amount */}
        <Input
          label="Loan Amount (SGD)"
          name="loanAmount"
          type="number"
          placeholder="Enter requested loan amount"
          value={loanAmount}
          onChange={handleLoanAmountChange}
          error={errors.loanAmount}
          required
          disabled={loading}
          leftAdornment={
            <span className="text-sm font-medium text-gray-500">$</span>
          }
          helperText="Minimum SGD 1,000 — Maximum SGD 10,000,000"
        />
      </div>

      {/* Actions */}
      <div className="mt-8 flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push("/applications")}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          loading={loading}
          disabled={loading}
        >
          {loading ? "Creating Application…" : "Create Application"}
        </Button>
      </div>
    </form>
  );
}

export { IntakeForm };
export type { IntakeFormProps };