import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      {/* Background Accent */}
      <div
        className="absolute inset-x-0 top-0 h-2"
        style={{ backgroundColor: "var(--dbs-red)" }}
        aria-hidden="true"
      />

      <div className="w-full max-w-md text-center">
        {/* Logo */}
        <div
          className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-xl text-lg font-bold text-white"
          style={{ backgroundColor: "var(--dbs-red)" }}
        >
          DBS
        </div>

        {/* 404 Illustration */}
        <div className="mb-6">
          <svg
            className="mx-auto h-24 w-24 text-gray-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        </div>

        {/* Error Code */}
        <h1
          className="mb-2 text-6xl font-bold tracking-tight"
          style={{ color: "var(--dbs-red)" }}
        >
          404
        </h1>

        {/* Title */}
        <h2 className="mb-2 text-xl font-semibold text-gray-900">
          Page Not Found
        </h2>

        {/* Description */}
        <p className="mb-8 text-sm text-gray-500">
          The page you are looking for doesn&apos;t exist or has been moved.
          Please check the URL or navigate back to the dashboard.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-md px-5 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 no-underline"
            style={{
              backgroundColor: "var(--dbs-red)",
            }}
          >
            <svg
              className="mr-2 h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
              />
            </svg>
            Go to Dashboard
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 no-underline"
            style={{
              // @ts-expect-error CSS custom property
              "--tw-ring-color": "var(--dbs-dark-blue)",
            }}
          >
            Sign In
          </Link>
        </div>

        {/* Footer */}
        <p className="mt-10 text-xs text-gray-400">
          © {new Date().getFullYear()} DBS Bank. Loan Verification Portal.
        </p>
      </div>
    </div>
  );
}