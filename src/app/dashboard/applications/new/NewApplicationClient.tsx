"use client";

import React from "react";
import IntakeForm from "@/components/forms/IntakeForm";
import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import { useRouter } from "next/navigation";

export default function NewApplicationClient() {
  const router = useRouter();

  const handleSuccess = (applicationId: string) => {
    router.push(`/dashboard/applications/${applicationId}/applicant`);
  };

  return (
    <Card>
      <CardHeader
        title="Application Intake"
        subtitle="Initialize a new loan application"
      />
      <CardBody>
        <IntakeForm onSuccess={handleSuccess} />
      </CardBody>
    </Card>
  );
}
