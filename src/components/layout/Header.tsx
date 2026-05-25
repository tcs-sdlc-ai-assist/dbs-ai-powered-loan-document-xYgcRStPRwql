"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { ROLES } from "@/lib/constants";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Navigation Items
// ---------------------------------------------------------------------------

interface NavItem {
  label: string;
  href: string;
  requiredRoles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    requiredRoles: ["ADMIN", "ANALYST", "REVIEWER", "VIEWER"],
  },
  {
    label: "Applications",
    href: "/applications",
    requiredRoles: ["ADMIN", "ANALYST", "REVIEWER", "VIEWER"],
  },
  {
    label: "Audit Logs",
    href: "/audit",
    requiredRoles: ["ADMIN", "ANALYST", "REVIEWER"],
  },
];

// ---------------------------------------------------------------------------
// Role Badge Colors
// ---------------------------------------------------------------------------

const ROLE_BADGE_COLORS: Record<UserRole, string> = {
  ADMIN: "bg-red-100 text-red-800",
  ANALYST: "bg-blue-100 text-blue-800",
  REVIEWER: "bg-purple-100 text-purple-800",
  VIEWER: "bg-gray-100 text-gray-800",
};

// ---------------------------------------------------------------------------
// Header Component
// ---------------------------------------------------------------------------

export default function Header() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  const userRole = session?.user?.role as UserRole | undefined;
  const userName = session?.user?.name ?? "";
  const roleConfig = userRole ? ROLES[userRole] : null;
  const roleLabel = roleConfig?.label ?? "";
  const roleBadgeColor = userRole
    ? ROLE_BADGE_COLORS[userRole]
    : "bg-gray-100 text-gray-800";

  const visibleNavItems = NAV_ITEMS.filter((item) => {
    if (!userRole) return false;
    return item.requiredRoles.includes(userRole);
  });

  const isActive = (href: string): boolean => {
    if (!pathname) return false;
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <header className="border-b border-gray-200 bg-white shadow-card">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Logo & Title */}
        <div className="flex items-center space-x-3">
          <Link href="/dashboard" className="flex items-center space-x-3 no-underline">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-md text-sm font-bold text-white"
              style={{ backgroundColor: "var(--dbs-red)" }}
            >
              DBS
            </div>
            <h1 className="hidden text-lg font-semibold tracking-tight text-gray-900 sm:block">
              Loan Verification Portal
            </h1>
          </Link>
        </div>

        {/* Navigation Links */}
        {status === "authenticated" && (
          <nav className="hidden items-center space-x-1 md:flex">
            {visibleNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors no-underline",
                  isActive(item.href)
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}

        {/* User Info & Logout */}
        {status === "authenticated" && session?.user && (
          <div className="flex items-center space-x-4">
            <div className="hidden items-center space-x-2 sm:flex">
              <span className="text-sm font-medium text-gray-700">
                {userName}
              </span>
              <span
                className={cn(
                  "badge",
                  roleBadgeColor
                )}
              >
                {roleLabel}
              </span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="btn-secondary text-sm"
            >
              Logout
            </button>
          </div>
        )}

        {status === "loading" && (
          <div className="flex items-center">
            <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
          </div>
        )}
      </div>

      {/* Mobile Navigation */}
      {status === "authenticated" && (
        <div className="border-t border-gray-100 md:hidden">
          <div className="mx-auto flex max-w-7xl items-center space-x-1 overflow-x-auto px-4 py-2 sm:px-6 lg:px-8">
            {visibleNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors no-underline",
                  isActive(item.href)
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                {item.label}
              </Link>
            ))}
            <div className="flex items-center space-x-2 pl-2 sm:hidden">
              <span
                className={cn(
                  "badge",
                  roleBadgeColor
                )}
              >
                {roleLabel}
              </span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}