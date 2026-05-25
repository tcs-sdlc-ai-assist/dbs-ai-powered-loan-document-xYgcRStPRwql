"use client";

import React from "react";
import { useRouter } from "next/navigation";
import CompletenessCheck from "@/components/features/CompletenessCheck";
import ExtractionResults from "@/components/features/ExtractionResults";
import Button from "@/components/ui/Button";

interface VerificationClientProps {
  applicationId: string;
}

export default function VerificationClient({ applicationId }: VerificationClientProps) {
  const router = useRouter();

  const handleNextStep = () => {
    router.push(`/dashboard/applications/${applicationId}/review`);
  };

  return (
    <div className="space-y-8">
      {/* Document Completeness Checklist */}
      <CompletenessCheck
        applicationId={applicationId}
        onUploadMissing={() => router.push(`/dashboard/applications/${applicationId}/documents`)}
      />

      {/* AI Extraction Results */}
      <ExtractionResults
        applicationId={applicationId}
        onReExtractComplete={() => router.refresh()}
      />

      {/* Navigation */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
        <Button
          variant="secondary"
          onClick={() => router.push(`/dashboard/applications/${applicationId}/documents`)}
        >
          Back to Upload
        </Button>
        <Button variant="primary" onClick={handleNextStep}>
          Proceed to Review
        </Button>
      </div>
    </div>
  );
}
