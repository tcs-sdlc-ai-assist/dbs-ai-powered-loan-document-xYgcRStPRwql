import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import AuditLogViewer from "@/components/features/AuditLogViewer";
import Card, { CardHeader, CardBody } from "@/components/ui/Card";

export default async function AuditLogsPage() {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/login");
  }

  const userRole = session.user.role;

  // Restrict access to ADMIN, ANALYST, and REVIEWER roles
  if (userRole !== "ADMIN" && userRole !== "ANALYST" && userRole !== "REVIEWER") {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          Audit Logs
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          View and search the complete audit trail of all actions performed
          across the loan verification portal. Filter by application, user,
          action type, and date range.
        </p>
      </div>

      {/* Audit Log Viewer */}
      <AuditLogViewer />
    </div>
  );
}