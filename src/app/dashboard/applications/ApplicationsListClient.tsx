"use client";

import React from "react";
import { useRouter } from "next/navigation";
import ApplicationCard from "@/components/features/ApplicationCard";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Spinner from "@/components/ui/Spinner";
import Alert from "@/components/ui/Alert";
import useApplication from "@/hooks/useApplication";

export default function ApplicationsListClient({ user }: { user: any }) {
  const router = useRouter();
  const { fetchApplicationList, loading, error } = useApplication();

  const [listData, setListData] = React.useState<any>(null);
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("all");
  const [page, setPage] = React.useState(1);

  const loadApplications = React.useCallback(async () => {
    const data = await fetchApplicationList({
      page,
      pageSize: 10,
      search: search || undefined,
      status: status === "all" ? undefined : (status as any),
    });
    if (data) {
      setListData(data);
    }
  }, [fetchApplicationList, page, search, status]);

  React.useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatus(e.target.value);
    setPage(1);
  };

  const handleView = (appId: string) => {
    router.push(`/dashboard/applications/${appId}`);
  };

  const handleContinue = (appId: string) => {
    const app = listData?.items.find((x: any) => x.applicationId === appId);
    if (!app) return;
    
    let path = `/dashboard/applications/${appId}`;
    switch (app.status) {
      case "DRAFT":
      case "SUBMITTED":
        path = `/dashboard/applications/${appId}/applicant`;
        break;
      case "UNDER_REVIEW":
      case "DOCUMENTS_PENDING":
      case "RETURNED":
        path = `/dashboard/applications/${appId}/documents`;
        break;
      case "EXTRACTION_COMPLETE":
      case "VALIDATION_COMPLETE":
        path = `/dashboard/applications/${appId}/verification`;
        break;
      case "RECOMMENDATION_GENERATED":
      case "ANALYST_REVIEW":
        path = `/dashboard/applications/${appId}/review`;
        break;
      default:
        path = `/dashboard/applications/${appId}`;
    }
    router.push(path);
  };

  const STATUS_OPTIONS = [
    { value: "all", label: "All Statuses" },
    { value: "DRAFT", label: "Draft" },
    { value: "SUBMITTED", label: "Submitted" },
    { value: "UNDER_REVIEW", label: "Under Review" },
    { value: "DOCUMENTS_PENDING", label: "Documents Pending" },
    { value: "ANALYST_REVIEW", label: "Analyst Review" },
    { value: "APPROVED", label: "Approved" },
    { value: "REJECTED", label: "Rejected" },
  ];

  return (
    <div className="space-y-6">
      {/* Header and Create Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Loan Applications</h1>
          <p className="text-sm text-gray-500">Manage and verify loan document validation pipeline</p>
        </div>
        <Button
          variant="primary"
          onClick={() => router.push("/dashboard/applications/new")}
        >
          New Application
        </Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 bg-white p-4 rounded-lg border border-gray-200">
        <Input
          label="Search"
          placeholder="Search by name or ID..."
          value={search}
          onChange={handleSearchChange}
        />
        <Select
          label="Status"
          options={STATUS_OPTIONS}
          value={status}
          onChange={handleStatusChange}
        />
      </div>

      {/* Error alert */}
      {error && <Alert variant="error" title="Error Loading Applications">{error}</Alert>}

      {/* List content */}
      {loading && !listData ? (
        <Spinner size="md" label="Loading applications..." className="py-12" />
      ) : listData?.items.length === 0 ? (
        <div className="text-center py-12 border border-gray-200 rounded-lg bg-gray-50">
          <p className="text-gray-500 font-medium">No applications found</p>
          <p className="text-sm text-gray-400 mt-1">Try modifying search filters or create a new application</p>
        </div>
      ) : (
        <div className="space-y-4">
          {listData?.items.map((app: any) => (
            <ApplicationCard
              key={app.id}
              id={app.id}
              applicationId={app.applicationId}
              applicantName={app.applicantName}
              loanType={app.loanType}
              loanAmount={app.loanAmount}
              status={app.status}
              updatedAt={app.updatedAt}
              createdAt={app.createdAt}
              onView={handleView}
              onContinue={handleContinue}
            />
          ))}

          {/* Pagination */}
          {listData && listData.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4">
              <div className="flex flex-1 justify-between sm:hidden">
                <Button
                  variant="secondary"
                  disabled={!listData.hasPreviousPage}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  disabled={!listData.hasNextPage}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing page <span className="font-medium">{listData.page}</span> of{" "}
                    <span className="font-medium">{listData.totalPages}</span> (
                    <span className="font-medium">{listData.total}</span> total items)
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!listData.hasPreviousPage}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!listData.hasNextPage}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
