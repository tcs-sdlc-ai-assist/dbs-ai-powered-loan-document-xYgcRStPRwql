"use client";

import React from "react";
import { useRouter } from "next/navigation";
import DiscrepancyTable from "@/components/features/DiscrepancyTable";
import ReviewForm from "@/components/forms/ReviewForm";
import ReviewHistory from "@/components/features/ReviewHistory";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import useApplication from "@/hooks/useApplication";

interface ReviewPageClientProps {
  applicationId: string;
  userRole: string;
  canResolveDiscrepancies: boolean;
  canGenerate: boolean;
  canOverride: boolean;
  canReview: boolean;
}

export default function ReviewPageClient({
  applicationId,
  userRole,
  canResolveDiscrepancies,
  canGenerate,
  canOverride,
  canReview,
}: ReviewPageClientProps) {
  const router = useRouter();
  const {
    recommendation,
    loading,
    error,
    fetchRecommendation,
    generateRecommendation,
  } = useApplication();

  const [hasLoaded, setHasLoaded] = React.useState(false);

  React.useEffect(() => {
    fetchRecommendation(applicationId).then(() => {
      setHasLoaded(true);
    });
  }, [applicationId, fetchRecommendation]);

  const handleGenerate = async () => {
    await generateRecommendation(applicationId);
    router.refresh();
  };

  const handleReviewSubmitted = () => {
    router.refresh();
  };

  const handleOverrideSubmitted = () => {
    router.refresh();
  };

  if (!hasLoaded && loading) {
    return <Spinner size="md" label="Loading recommendation..." className="py-12" />;
  }

  return (
    <div className="space-y-8">
      {/* Discrepancies check table */}
      <DiscrepancyTable
        applicationId={applicationId}
        canResolve={canResolveDiscrepancies}
        onDiscrepancyResolved={() => router.refresh()}
      />

      {/* AI Recommendation display / generation */}
      {!recommendation ? (
        <Card>
          <CardHeader title="AI Recommendation Needed" />
          <CardBody>
            <p className="text-sm text-gray-500 mb-4">
              An AI recommendation has not been generated for this application yet.
            </p>
            {canGenerate && (
              <Button onClick={handleGenerate} loading={loading}>
                Generate AI Recommendation
              </Button>
            )}
          </CardBody>
        </Card>
      ) : (
        /* Review / Override Form */
        canReview && (
          <ReviewForm
            applicationId={applicationId}
            recommendation={recommendation}
            onReviewSubmitted={handleReviewSubmitted}
            onOverrideSubmitted={handleOverrideSubmitted}
          />
        )
      )}

      {/* Review History log */}
      <ReviewHistory applicationId={applicationId} />

      {/* Navigation Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
        <Button
          variant="secondary"
          onClick={() => router.push(`/dashboard/applications/${applicationId}/verification`)}
        >
          Back to Verification
        </Button>
        <Button
          variant="primary"
          onClick={() => router.push(`/dashboard/applications/${applicationId}/summary`)}
        >
          View Summary
        </Button>
      </div>
    </div>
  );
}
