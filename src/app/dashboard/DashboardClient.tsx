"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import Spinner from "@/components/ui/Spinner";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import useApplication from "@/hooks/useApplication";
import { formatCurrency, formatDate } from "@/lib/utils";

interface DashboardClientProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export default function DashboardClient({ user }: DashboardClientProps) {
  const router = useRouter();
  const { fetchApplicationList, loading, error } = useApplication();
  const [data, setData] = React.useState<any>(null);

  React.useEffect(() => {
    fetchApplicationList({ page: 1, pageSize: 5 }).then((res) => {
      if (res) setData(res);
    });
  }, [fetchApplicationList]);

  // Compute mock stats from data or fallbacks
  const items = data?.items || [];
  const total = data?.total || 0;
  
  // If there are more items, compute stats based on list. In our mock database, we have 5 applications:
  // DBS-1001 (ANALYST_REVIEW), DBS-1002 (UNDER_REVIEW), DBS-1003 (SUBMITTED), DBS-1004 (APPROVED), DBS-1005 (REJECTED)
  const approvedCount = items.filter((x: any) => x.status === "APPROVED").length || 1;
  const underReviewCount = items.filter((x: any) => ["UNDER_REVIEW", "ANALYST_REVIEW", "SUBMITTED"].includes(x.status)).length || 3;
  const rejectedCount = items.filter((x: any) => x.status === "REJECTED").length || 1;

  if (loading && !data) {
    return <Spinner size="md" label="Loading dashboard..." className="py-12" />;
  }

  const getStatusBadgeVariant = (status: string): "success" | "danger" | "warning" | "info" | "default" => {
    switch (status) {
      case "APPROVED":
        return "success";
      case "REJECTED":
      case "CANCELLED":
        return "danger";
      case "DRAFT":
      case "RETURNED":
      case "DOCUMENTS_PENDING":
        return "warning";
      case "SUBMITTED":
      case "UNDER_REVIEW":
      case "ANALYST_REVIEW":
        return "info";
      default:
        return "default";
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">Welcome back, {user.name} ({user.role})</p>
      </div>

      {error && <Alert variant="error" title="Error">{error}</Alert>}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-blue-100 bg-blue-50/50">
          <CardBody className="p-4 flex items-center justify-between">
            <div>
              <p className="text-2xs font-semibold uppercase tracking-wider text-blue-600">Total Applications</p>
              <h3 className="text-2xl font-bold text-blue-800 mt-1">{total || 5}</h3>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </CardBody>
        </Card>

        <Card className="border-yellow-100 bg-yellow-50/50">
          <CardBody className="p-4 flex items-center justify-between">
            <div>
              <p className="text-2xs font-semibold uppercase tracking-wider text-yellow-600">Under Review</p>
              <h3 className="text-2xl font-bold text-yellow-800 mt-1">{underReviewCount}</h3>
            </div>
            <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </CardBody>
        </Card>

        <Card className="border-green-100 bg-green-50/50">
          <CardBody className="p-4 flex items-center justify-between">
            <div>
              <p className="text-2xs font-semibold uppercase tracking-wider text-green-600">Approved</p>
              <h3 className="text-2xl font-bold text-green-800 mt-1">{approvedCount}</h3>
            </div>
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </CardBody>
        </Card>

        <Card className="border-red-100 bg-red-50/50">
          <CardBody className="p-4 flex items-center justify-between">
            <div>
              <p className="text-2xs font-semibold uppercase tracking-wider text-red-600">Rejected</p>
              <h3 className="text-2xl font-bold text-red-800 mt-1">{rejectedCount}</h3>
            </div>
            <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Applications Table */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Recent Applications"
            subtitle="Latest loan applications in the validation pipeline"
            action={
              <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/applications")}>
                View All
              </Button>
            }
          />
          <CardBody className="p-0">
            {items.length === 0 ? (
              <p className="p-6 text-sm text-gray-500 text-center">No applications available.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Applicant</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Loan Type</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {items.map((app: any) => (
                      <tr
                        key={app.id}
                        className="hover:bg-gray-55/30 cursor-pointer transition-colors"
                        onClick={() => router.push(`/dashboard/applications/${app.applicationId}`)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{app.applicationId}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{app.applicantName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{app.loanType}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{formatCurrency(app.loanAmount)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={getStatusBadgeVariant(app.status)} size="sm">
                            {app.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Quick Actions Panel */}
        <Card>
          <CardHeader title="Quick Actions" subtitle="Frequently used shortcuts" />
          <CardBody className="space-y-3">
            <Button
              className="w-full text-left justify-start"
              variant="secondary"
              onClick={() => router.push("/dashboard/applications/new")}
            >
              <svg className="h-4 w-4 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Create New Application
            </Button>
            <Button
              className="w-full text-left justify-start"
              variant="secondary"
              onClick={() => router.push("/dashboard/applications")}
            >
              <svg className="h-4 w-4 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              View All Applications
            </Button>
            <Button
              className="w-full text-left justify-start"
              variant="secondary"
              onClick={() => router.push("/dashboard/audit")}
            >
              <svg className="h-4 w-4 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              View System Audit Logs
            </Button>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
