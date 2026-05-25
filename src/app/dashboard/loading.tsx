import Card, { CardHeader, CardBody } from "@/components/ui/Card";

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-gray-200 ${className ?? ""}`}
    />
  );
}

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Page Header Skeleton */}
      <div>
        <SkeletonBlock className="h-8 w-64 mb-2" />
        <SkeletonBlock className="h-4 w-96" />
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={`stat-skeleton-${i}`}>
            <CardBody>
              <div className="flex flex-col items-center justify-center py-2">
                <SkeletonBlock className="h-6 w-6 rounded-full mb-2" />
                <SkeletonBlock className="h-8 w-16 mb-1" />
                <SkeletonBlock className="h-3 w-20" />
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Main Content Skeleton */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Applications Skeleton */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <SkeletonBlock className="h-5 w-40 mb-2" />
                <SkeletonBlock className="h-3 w-56" />
              </div>
              <SkeletonBlock className="h-8 w-20 rounded-md" />
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={`app-skeleton-${i}`}
                  className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <SkeletonBlock className="h-5 w-5 rounded flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <SkeletonBlock className="h-4 w-24 mb-1.5" />
                      <SkeletonBlock className="h-3 w-36" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    <SkeletonBlock className="h-5 w-16 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Activity / Summary Skeleton */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <SkeletonBlock className="h-5 w-36 mb-2" />
                <SkeletonBlock className="h-3 w-48" />
              </div>
              <SkeletonBlock className="h-8 w-20 rounded-md" />
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={`activity-skeleton-${i}`}
                  className="flex items-center gap-3 rounded-lg border border-gray-100 px-4 py-3"
                >
                  <SkeletonBlock className="h-8 w-8 rounded-full flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <SkeletonBlock className="h-4 w-48 mb-1.5" />
                    <SkeletonBlock className="h-3 w-32" />
                  </div>
                  <SkeletonBlock className="h-3 w-20 flex-shrink-0" />
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Table Skeleton */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <SkeletonBlock className="h-5 w-44 mb-2" />
              <SkeletonBlock className="h-3 w-64" />
            </div>
            <div className="flex items-center gap-2">
              <SkeletonBlock className="h-8 w-24 rounded-md" />
              <SkeletonBlock className="h-8 w-24 rounded-md" />
            </div>
          </div>
        </CardHeader>
        <CardBody>
          {/* Table Header */}
          <div className="mb-3 flex items-center gap-4 border-b border-gray-200 pb-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonBlock
                key={`th-skeleton-${i}`}
                className="h-3 flex-1"
              />
            ))}
          </div>

          {/* Table Rows */}
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={`row-skeleton-${i}`}
                className="flex items-center gap-4 border-b border-gray-100 pb-3"
              >
                {Array.from({ length: 5 }).map((_, j) => (
                  <SkeletonBlock
                    key={`cell-skeleton-${i}-${j}`}
                    className="h-4 flex-1"
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Pagination Skeleton */}
          <div className="mt-4 flex items-center justify-between">
            <SkeletonBlock className="h-4 w-40" />
            <div className="flex items-center gap-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonBlock
                  key={`page-skeleton-${i}`}
                  className="h-8 w-8 rounded-md"
                />
              ))}
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}