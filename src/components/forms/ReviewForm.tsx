"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { RECOMMENDATION_TYPES } from "@/lib/constants";
import type { RecommendationType } from "@prisma/client";
import type { ApiResponse } from "@/types/types";
import { cn, getRecommendationColor } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import Textarea from "@/components/ui/Textarea";
import Select from "@/components/ui/Select";
import Card, { CardHeader, CardBody, CardFooter } from "@/components/ui/Card";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReviewFormProps {
  /** The application ID (human-readable, e.g. DBS-1001) */
  applicationId: string;
  /** AI-generated recommendation data */
  recommendation?: {
    id?: string;
    recommendation: RecommendationType;
    rationale: string;
    confidence: number;
    createdBy?: {
      id: string;
      name: string;
      email: string;
    } | null;
    createdAt?: string;
  } | null;
  /** Optional callback fired after successful review submission */
  onReviewSubmitted?: () => void;
  /** Optional callback fired after successful override submission */
  onOverrideSubmitted?: () => void;
  /** Optional class names for the wrapper */
  className?: string;
}

interface ReviewFormErrors {
  comment?: string;
  overrideComment?: string;
  overrideRecommendation?: string;
  justification?: string;
}

// ---------------------------------------------------------------------------
// Override Recommendation Options
// ---------------------------------------------------------------------------

const OVERRIDE_RECOMMENDATION_OPTIONS = [
  { value: "APPROVE", label: "Approve" },
  { value: "REJECT", label: "Reject" },
  { value: "REFER_TO_ANALYST", label: "Refer to Analyst" },
  { value: "REQUEST_MORE_INFO", label: "Request More Info" },
];

// ---------------------------------------------------------------------------
// Confidence Badge Variant
// ---------------------------------------------------------------------------

function getConfidenceBadgeVariant(
  confidence: number
): "success" | "warning" | "danger" | "info" {
  if (confidence >= 0.9) return "success";
  if (confidence >= 0.7) return "warning";
  if (confidence >= 0.5) return "info";
  return "danger";
}

// ---------------------------------------------------------------------------
// Recommendation Badge Variant
// ---------------------------------------------------------------------------

function getRecommendationBadgeVariant(
  recommendation: RecommendationType
): "success" | "danger" | "warning" | "info" {
  switch (recommendation) {
    case "APPROVE":
      return "success";
    case "REJECT":
      return "danger";
    case "REFER_TO_ANALYST":
      return "warning";
    case "REQUEST_MORE_INFO":
      return "info";
    default:
      return "info";
  }
}

// ---------------------------------------------------------------------------
// ReviewForm Component
// ---------------------------------------------------------------------------

export default function ReviewForm({
  applicationId,
  recommendation,
  onReviewSubmitted,
  onOverrideSubmitted,
  className,
}: ReviewFormProps) {
  const router = useRouter();
  const { data: session } = useSession();

  // Review comment state
  const [comment, setComment] = React.useState("");

  // Override state
  const [showOverride, setShowOverride] = React.useState(false);
  const [overrideComment, setOverrideComment] = React.useState("");
  const [overrideRecommendation, setOverrideRecommendation] =
    React.useState<string>("");
  const [justification, setJustification] = React.useState("");

  // UI state
  const [errors, setErrors] = React.useState<ReviewFormErrors>({});
  const [reviewSubmitError, setReviewSubmitError] = React.useState<string | null>(null);
  const [overrideSubmitError, setOverrideSubmitError] = React.useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = React.useState<string | null>(null);
  const [overrideSuccess, setOverrideSuccess] = React.useState<string | null>(null);
  const [reviewLoading, setReviewLoading] = React.useState(false);
  const [overrideLoading, setOverrideLoading] = React.useState(false);

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  const validateReviewForm = (): boolean => {
    const formErrors: ReviewFormErrors = {};
    let isValid = true;

    if (!comment || comment.trim().length === 0) {
      formErrors.comment = "Comment is required";
      isValid = false;
    } else if (comment.trim().length > 5000) {
      formErrors.comment = "Comment must be at most 5000 characters";
      isValid = false;
    }

    setErrors((prev) => ({ ...prev, comment: formErrors.comment }));
    return isValid;
  };

  const validateOverrideForm = (): boolean => {
    const formErrors: ReviewFormErrors = {};
    let isValid = true;

    if (!overrideComment || overrideComment.trim().length === 0) {
      formErrors.overrideComment = "Comment is required";
      isValid = false;
    } else if (overrideComment.trim().length > 5000) {
      formErrors.overrideComment = "Comment must be at most 5000 characters";
      isValid = false;
    }

    if (!overrideRecommendation) {
      formErrors.overrideRecommendation = "Override recommendation is required";
      isValid = false;
    }

    if (!justification || justification.trim().length === 0) {
      formErrors.justification =
        "Justification is required when overriding a recommendation";
      isValid = false;
    } else if (justification.trim().length > 5000) {
      formErrors.justification =
        "Justification must be at most 5000 characters";
      isValid = false;
    }

    setErrors((prev) => ({
      ...prev,
      overrideComment: formErrors.overrideComment,
      overrideRecommendation: formErrors.overrideRecommendation,
      justification: formErrors.justification,
    }));
    return isValid;
  };

  // ---------------------------------------------------------------------------
  // Submit Review (Add Comment)
  // ---------------------------------------------------------------------------

  const handleReviewSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setReviewSubmitError(null);
    setReviewSuccess(null);

    if (!validateReviewForm()) {
      return;
    }

    setReviewLoading(true);

    try {
      const response = await fetch(`/api/review/${applicationId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          comment: comment.trim(),
        }),
      });

      const data: ApiResponse<{ id: string }> = await response.json();

      if (!response.ok || !data.success) {
        const errorMessage =
          data.error || `Failed to submit review (${response.status})`;
        setReviewSubmitError(errorMessage);
        return;
      }

      setReviewSuccess("Review comment submitted successfully.");
      setComment("");

      if (onReviewSubmitted) {
        onReviewSubmitted();
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "An unexpected error occurred";
      setReviewSubmitError(message);
    } finally {
      setReviewLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Submit Override
  // ---------------------------------------------------------------------------

  const handleOverrideSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setOverrideSubmitError(null);
    setOverrideSuccess(null);

    if (!validateOverrideForm()) {
      return;
    }

    setOverrideLoading(true);

    try {
      const response = await fetch(
        `/api/review/${applicationId}/override`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            comment: overrideComment.trim(),
            overrideRecommendation,
            justification: justification.trim(),
          }),
        }
      );

      const data: ApiResponse<{ id: string }> = await response.json();

      if (!response.ok || !data.success) {
        const errorMessage =
          data.error || `Failed to submit override (${response.status})`;
        setOverrideSubmitError(errorMessage);
        return;
      }

      setOverrideSuccess("Override submitted successfully.");
      setOverrideComment("");
      setOverrideRecommendation("");
      setJustification("");
      setShowOverride(false);

      if (onOverrideSubmitted) {
        onOverrideSubmitted();
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "An unexpected error occurred";
      setOverrideSubmitError(message);
    } finally {
      setOverrideLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Field Change Handlers
  // ---------------------------------------------------------------------------

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setComment(e.target.value);
    if (errors.comment) {
      setErrors((prev) => ({ ...prev, comment: undefined }));
    }
  };

  const handleOverrideCommentChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setOverrideComment(e.target.value);
    if (errors.overrideComment) {
      setErrors((prev) => ({ ...prev, overrideComment: undefined }));
    }
  };

  const handleOverrideRecommendationChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setOverrideRecommendation(e.target.value);
    if (errors.overrideRecommendation) {
      setErrors((prev) => ({ ...prev, overrideRecommendation: undefined }));
    }
  };

  const handleJustificationChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setJustification(e.target.value);
    if (errors.justification) {
      setErrors((prev) => ({ ...prev, justification: undefined }));
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const recommendationConfig = recommendation
    ? RECOMMENDATION_TYPES[recommendation.recommendation]
    : null;

  return (
    <div className={cn("w-full space-y-6", className)}>
      {/* AI Recommendation Section */}
      <Card>
        <CardHeader
          title="AI Recommendation"
          subtitle="Generated recommendation based on document analysis and cross-validation"
        />
        <CardBody>
          {recommendation ? (
            <div className="space-y-4">
              {/* Recommendation & Confidence */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-500">
                    Recommendation:
                  </span>
                  <Badge
                    variant={getRecommendationBadgeVariant(
                      recommendation.recommendation
                    )}
                    size="lg"
                  >
                    {recommendationConfig
                      ? recommendationConfig.label
                      : recommendation.recommendation}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-500">
                    Confidence:
                  </span>
                  <Badge
                    variant={getConfidenceBadgeVariant(
                      recommendation.confidence
                    )}
                    size="md"
                  >
                    {(recommendation.confidence * 100).toFixed(1)}%
                  </Badge>
                </div>
              </div>

              {/* Rationale */}
              <div>
                <h4 className="mb-1 text-sm font-semibold text-gray-700">
                  Rationale
                </h4>
                <p className="whitespace-pre-wrap rounded-md border border-gray-200 bg-gray-50 p-3 text-sm leading-relaxed text-gray-700">
                  {recommendation.rationale}
                </p>
              </div>

              {/* Created By */}
              {recommendation.createdBy && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>Generated by:</span>
                  <span className="font-medium text-gray-700">
                    {recommendation.createdBy.name}
                  </span>
                  {recommendation.createdAt && (
                    <>
                      <span>•</span>
                      <span>
                        {new Date(recommendation.createdAt).toLocaleString()}
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8">
              <svg
                className="mb-3 h-10 w-10 text-gray-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
                />
              </svg>
              <p className="text-sm text-gray-500">
                No AI recommendation has been generated yet.
              </p>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Review Comment Section */}
      <Card>
        <CardHeader
          title="Analyst Review"
          subtitle="Add your review comments for this application"
        />
        <CardBody>
          {/* Success Message */}
          {reviewSuccess && (
            <Alert
              variant="success"
              title="Success"
              dismissible
              onDismiss={() => setReviewSuccess(null)}
              className="mb-4"
            >
              {reviewSuccess}
            </Alert>
          )}

          {/* Error Message */}
          {reviewSubmitError && (
            <Alert
              variant="error"
              title="Submission Failed"
              dismissible
              onDismiss={() => setReviewSubmitError(null)}
              className="mb-4"
            >
              {reviewSubmitError}
            </Alert>
          )}

          <form onSubmit={handleReviewSubmit} noValidate>
            <Textarea
              label="Review Comment"
              name="comment"
              placeholder="Enter your review comments, observations, or notes about this application…"
              value={comment}
              onChange={handleCommentChange}
              error={errors.comment}
              required
              disabled={reviewLoading}
              rows={4}
              resize="vertical"
              maxCharacters={5000}
              showCharacterCount
            />

            <div className="mt-4 flex items-center justify-end">
              <Button
                type="submit"
                variant="primary"
                loading={reviewLoading}
                disabled={reviewLoading || overrideLoading}
              >
                {reviewLoading ? "Submitting…" : "Add Comment"}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {/* Override Section */}
      <Card>
        <CardHeader
          title="Override Recommendation"
          subtitle="Override the AI recommendation with your own assessment"
          action={
            !showOverride ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowOverride(true)}
                disabled={reviewLoading || overrideLoading}
              >
                Override
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowOverride(false);
                  setOverrideSubmitError(null);
                  setErrors((prev) => ({
                    ...prev,
                    overrideComment: undefined,
                    overrideRecommendation: undefined,
                    justification: undefined,
                  }));
                }}
                disabled={overrideLoading}
              >
                Cancel
              </Button>
            )
          }
        />
        {showOverride && (
          <CardBody>
            {/* Override Success Message */}
            {overrideSuccess && (
              <Alert
                variant="success"
                title="Success"
                dismissible
                onDismiss={() => setOverrideSuccess(null)}
                className="mb-4"
              >
                {overrideSuccess}
              </Alert>
            )}

            {/* Override Error Message */}
            {overrideSubmitError && (
              <Alert
                variant="error"
                title="Override Failed"
                dismissible
                onDismiss={() => setOverrideSubmitError(null)}
                className="mb-4"
              >
                {overrideSubmitError}
              </Alert>
            )}

            <Alert
              variant="warning"
              title="Override Notice"
              className="mb-4"
            >
              Overriding the AI recommendation requires a mandatory
              justification. This action will be recorded in the audit trail.
            </Alert>

            <form onSubmit={handleOverrideSubmit} noValidate>
              <div className="space-y-5">
                {/* Override Recommendation */}
                <Select
                  label="Override Recommendation"
                  name="overrideRecommendation"
                  placeholder="Select a recommendation"
                  options={OVERRIDE_RECOMMENDATION_OPTIONS}
                  value={overrideRecommendation}
                  onChange={handleOverrideRecommendationChange}
                  error={errors.overrideRecommendation}
                  required
                  disabled={overrideLoading}
                />

                {/* Override Comment */}
                <Textarea
                  label="Comment"
                  name="overrideComment"
                  placeholder="Enter your review comments for this override…"
                  value={overrideComment}
                  onChange={handleOverrideCommentChange}
                  error={errors.overrideComment}
                  required
                  disabled={overrideLoading}
                  rows={3}
                  resize="vertical"
                  maxCharacters={5000}
                  showCharacterCount
                />

                {/* Justification */}
                <Textarea
                  label="Justification"
                  name="justification"
                  placeholder="Provide a detailed justification for overriding the AI recommendation. This is mandatory and will be recorded in the audit trail."
                  value={justification}
                  onChange={handleJustificationChange}
                  error={errors.justification}
                  required
                  disabled={overrideLoading}
                  rows={4}
                  resize="vertical"
                  maxCharacters={5000}
                  showCharacterCount
                  helperText="A detailed justification is required for all overrides"
                />
              </div>

              <div className="mt-4 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowOverride(false);
                    setOverrideSubmitError(null);
                    setOverrideComment("");
                    setOverrideRecommendation("");
                    setJustification("");
                    setErrors((prev) => ({
                      ...prev,
                      overrideComment: undefined,
                      overrideRecommendation: undefined,
                      justification: undefined,
                    }));
                  }}
                  disabled={overrideLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  loading={overrideLoading}
                  disabled={reviewLoading || overrideLoading}
                >
                  {overrideLoading
                    ? "Submitting Override…"
                    : "Override Recommendation"}
                </Button>
              </div>
            </form>
          </CardBody>
        )}
        {!showOverride && (
          <CardBody>
            <p className="text-sm text-gray-500">
              Click the &quot;Override&quot; button above to override the AI
              recommendation with your own assessment.
            </p>
          </CardBody>
        )}
      </Card>
    </div>
  );
}

export { ReviewForm };
export type { ReviewFormProps };