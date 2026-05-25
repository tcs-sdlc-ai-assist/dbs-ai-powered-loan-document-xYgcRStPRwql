"use client";

import React from "react";
import DocumentUpload from "@/components/forms/DocumentUpload";
import Button from "@/components/ui/Button";
import { useRouter } from "next/navigation";

interface DocumentUploadClientProps {
  applicationId: string;
  existingDocuments: any[];
}

export default function DocumentUploadClient({
  applicationId,
  existingDocuments,
}: DocumentUploadClientProps) {
  const router = useRouter();

  const handleNextStep = () => {
    router.push(`/dashboard/applications/${applicationId}/verification`);
  };

  return (
    <div className="space-y-6">
      <DocumentUpload
        applicationId={applicationId}
        existingDocuments={existingDocuments}
        onUploadComplete={() => {
          router.refresh();
        }}
      />
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
        <Button
          variant="secondary"
          onClick={() => router.push(`/dashboard/applications/${applicationId}`)}
        >
          Back to Details
        </Button>
        <Button variant="primary" onClick={handleNextStep}>
          Proceed to AI Verification
        </Button>
      </div>
    </div>
  );
}
