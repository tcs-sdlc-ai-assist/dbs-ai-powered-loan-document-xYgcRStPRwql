"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { z } from "zod";
import { applicantDetailsSchema } from "@/lib/validation-schemas";
import type { ApplicantDetailsInput } from "@/lib/validation-schemas";
import { LOAN_TYPES } from "@/lib/constants";
import type { ApiResponse } from "@/types/types";
import type { ApplicationStatusEnum } from "@prisma/client";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ApplicantFormProps {
  /** The application ID (human-readable, e.g. DBS-1001) */
  applicationId: string;
  /** Pre-populated applicant data from the application record */
  initialData?: {
    applicantName?: string;
    loanType?: string;
    loanAmount?: number;
    status?: ApplicationStatusEnum;
  };
  /** Optional callback fired after successful submission */
  onSuccess?: () => void;
  /** Optional class names for the form wrapper */
  className?: string;
}

interface FormErrors {
  applicantName?: string;
  loanType?: string;
  loanAmount?: string;
  email?: string;
  phone?: string;
  address?: string;
  employerName?: string;
  designation?: string;
  annualIncome?: string;
  loanPurpose?: string;
}

// ---------------------------------------------------------------------------
// Loan Type Options
// ---------------------------------------------------------------------------

const LOAN_TYPE_OPTIONS = LOAN_TYPES.map((type) => ({
  value: type,
  label: type,
}));

// ---------------------------------------------------------------------------
// Local Validation Schema (extends applicant details with additional fields)
// ---------------------------------------------------------------------------

const applicantFormSchema = z.object({
  applicantName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(200, "Full name must be at most 200 characters"),
  loanType: z
    .string()
    .refine((val) => (LOAN_TYPES as readonly string[]).includes(val), {
      message: `Loan type must be one of: ${LOAN_TYPES.join(", ")}`,
    }),
  loanAmount: z
    .number()
    .min(1000, "Loan amount must be at least 1,000")
    .max(10000000, "Loan amount must be at most 10,000,000"),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  phone: z
    .string()
    .trim()
    .min(1, "Phone number is required")
    .max(20, "Phone number must be at most 20 characters"),
  address: z
    .string()
    .trim()
    .min(5, "Address must be at least 5 characters")
    .max(500, "Address must be at most 500 characters"),
  employerName: z
    .string()
    .trim()
    .min(1, "Employer name is required")
    .max(200, "Employer name must be at most 200 characters"),
  designation: z
    .string()
    .trim()
    .min(1, "Designation is required")
    .max(200, "Designation must be at most 200 characters"),
  annualIncome: z
    .number()
    .min(0, "Annual income must be a positive number")
    .max(100000000, "Annual income must be at most 100,000,000"),
  loanPurpose: z
    .string()
    .trim()
    .min(5, "Loan purpose must be at least 5 characters")
    .max(2000, "Loan purpose must be at most 2000 characters"),
});

type ApplicantFormData = z.infer<typeof applicantFormSchema>;

// ---------------------------------------------------------------------------
// ApplicantForm Component
// ---------------------------------------------------------------------------

export default function ApplicantForm({
  applicationId,
  initialData,
  onSuccess,
  className,
}: ApplicantFormProps) {
  const router = useRouter();
  const { data: session } = useSession();

  // Form state — core fields
  const [applicantName, setApplicantName] = React.useState(
    initialData?.applicantName ?? ""
  );
  const [loanType, setLoanType] = React.useState(
    initialData?.loanType ?? ""
  );
  const [loanAmount, setLoanAmount] = React.useState(
    initialData?.loanAmount !== undefined ? String(initialData.loanAmount) : ""
  );

  // Form state — additional applicant fields
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [employerName, setEmployerName] = React.useState("");
  const [designation, setDesignation] = React.useState("");
  const [annualIncome, setAnnualIncome] = React.useState("");
  const [loanPurpose, setLoanPurpose] = React.useState("");

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

    const parsedLoanAmount = parseFloat(loanAmount);
    const parsedAnnualIncome = parseFloat(annualIncome);

    const result = applicantFormSchema.safeParse({
      applicantName: applicantName.trim(),
      loanType,
      loanAmount: isNaN(parsedLoanAmount) ? 0 : parsedLoanAmount,
      email: email.trim(),
      phone: phone.trim(),
      address: address.trim(),
      employerName: employerName.trim(),
      designation: designation.trim(),
      annualIncome: isNaN(parsedAnnualIncome) ? -1 : parsedAnnualIncome,
      loanPurpose: loanPurpose.trim(),
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
    } else if (isNaN(parsedLoanAmount)) {
      formErrors.loanAmount = "Loan amount must be a valid number";
      isValid = false;
    }

    if (!annualIncome || annualIncome.trim() === "") {
      formErrors.annualIncome = "Annual income is required";
      isValid = false;
    } else if (isNaN(parsedAnnualIncome)) {
      formErrors.annualIncome = "Annual income must be a valid number";
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

    const parsedLoanAmount = parseFloat(loanAmount);

    const payload: ApplicantDetailsInput = {
      applicantName: applicantName.trim(),
      loanType,
      loanAmount: parsedLoanAmount,
    };

    setLoading(true);

    try {
      const response = await fetch(
        `/api/applications/${applicationId}/applicant`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data: ApiResponse<{ id: string; applicationId: string }> =
        await response.json();

      if (!response.ok || !data.success) {
        const errorMessage =
          data.error || `Failed to update applicant details (${response.status})`;
        setSubmitError(errorMessage);
        return;
      }

      if (onSuccess) {
        onSuccess();
      } else {
        router.push(`/dashboard/applications/${applicationId}/documents`);
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

  const clearError = (field: keyof FormErrors) => {
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleApplicantNameChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setApplicantName(e.target.value);
    clearError("applicantName");
  };

  const handleLoanTypeChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setLoanType(e.target.value);
    clearError("loanType");
  };

  const handleLoanAmountChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setLoanAmount(e.target.value);
    clearError("loanAmount");
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    clearError("email");
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(e.target.value);
    clearError("phone");
  };

  const handleAddressChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setAddress(e.target.value);
    clearError("address");
  };

  const handleEmployerNameChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setEmployerName(e.target.value);
    clearError("employerName");
  };

  const handleDesignationChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setDesignation(e.target.value);
    clearError("designation");
  };

  const handleAnnualIncomeChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setAnnualIncome(e.target.value);
    clearError("annualIncome");
  };

  const handleLoanPurposeChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setLoanPurpose(e.target.value);
    clearError("loanPurpose");
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

      {/* Personal Information Section */}
      <div className="mb-8">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Personal Information
        </h3>
        <div className="space-y-5">
          {/* Full Name */}
          <Input
            label="Full Name"
            name="applicantName"
            type="text"
            placeholder="Enter applicant's full name"
            value={applicantName}
            onChange={handleApplicantNameChange}
            error={errors.applicantName}
            required
            disabled={loading}
          />

          {/* Email */}
          <Input
            label="Email Address"
            name="email"
            type="email"
            placeholder="Enter email address"
            value={email}
            onChange={handleEmailChange}
            error={errors.email}
            required
            disabled={loading}
          />

          {/* Phone */}
          <Input
            label="Phone Number"
            name="phone"
            type="tel"
            placeholder="Enter phone number"
            value={phone}
            onChange={handlePhoneChange}
            error={errors.phone}
            required
            disabled={loading}
          />

          {/* Address */}
          <Textarea
            label="Residential Address"
            name="address"
            placeholder="Enter full residential address"
            value={address}
            onChange={handleAddressChange}
            error={errors.address}
            required
            disabled={loading}
            rows={3}
            resize="vertical"
          />
        </div>
      </div>

      {/* Employment Details Section */}
      <div className="mb-8">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Employment Details
        </h3>
        <div className="space-y-5">
          {/* Employer Name */}
          <Input
            label="Employer Name"
            name="employerName"
            type="text"
            placeholder="Enter employer's name"
            value={employerName}
            onChange={handleEmployerNameChange}
            error={errors.employerName}
            required
            disabled={loading}
          />

          {/* Designation */}
          <Input
            label="Designation / Job Title"
            name="designation"
            type="text"
            placeholder="Enter your designation"
            value={designation}
            onChange={handleDesignationChange}
            error={errors.designation}
            required
            disabled={loading}
          />

          {/* Annual Income */}
          <Input
            label="Annual Income (SGD)"
            name="annualIncome"
            type="number"
            placeholder="Enter annual income"
            value={annualIncome}
            onChange={handleAnnualIncomeChange}
            error={errors.annualIncome}
            required
            disabled={loading}
            leftAdornment={
              <span className="text-sm font-medium text-gray-500">$</span>
            }
            helperText="Gross annual income before tax"
          />
        </div>
      </div>

      {/* Loan Details Section */}
      <div className="mb-8">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Loan Details
        </h3>
        <div className="space-y-5">
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

          {/* Loan Purpose */}
          <Textarea
            label="Loan Purpose"
            name="loanPurpose"
            placeholder="Describe the purpose of this loan"
            value={loanPurpose}
            onChange={handleLoanPurposeChange}
            error={errors.loanPurpose}
            required
            disabled={loading}
            rows={3}
            resize="vertical"
            maxCharacters={2000}
            showCharacterCount
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push(`/dashboard/applications/${applicationId}`)}
          disabled={loading}
        >
          Back
        </Button>
        <Button
          type="submit"
          variant="primary"
          loading={loading}
          disabled={loading}
        >
          {loading ? "Saving…" : "Save & Continue"}
        </Button>
      </div>
    </form>
  );
}

export { ApplicantForm };
export type { ApplicantFormProps };