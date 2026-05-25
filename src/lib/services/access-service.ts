import { ROLES } from "@/lib/constants";
import type { Permission } from "@/lib/constants";
import type { UserRole } from "@prisma/client";
import type { AccessCheckResult } from "@/types/types";
import auditLogger from "@/lib/services/audit-service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AccessCheckInput {
  userId: string;
  role: UserRole;
  permission: Permission;
  resourceId?: string;
  ipAddress?: string | null;
}

// ---------------------------------------------------------------------------
// AccessController Service
// ---------------------------------------------------------------------------

class AccessController {
  /**
   * Checks whether a user with the given role has the specified permission.
   * If access is denied, an audit log entry is recorded for traceability.
   *
   * @param input - The access check parameters including userId, role, permission, and optional resourceId.
   * @returns An AccessCheckResult indicating whether access is allowed and the reason.
   */
  async checkAccess(input: AccessCheckInput): Promise<AccessCheckResult> {
    const { userId, role, permission, resourceId, ipAddress } = input;

    // Validate that the role exists in the ROLES configuration
    const roleConfig = ROLES[role];

    if (!roleConfig) {
      await this.logAccessDenial({
        userId,
        role,
        permission,
        resourceId,
        ipAddress,
        reason: `Unknown role: ${role}`,
      });

      return {
        allowed: false,
        reason: `Unknown role: ${role}`,
      };
    }

    // Check if the role has the required permission
    const hasPermission = roleConfig.permissions.includes(permission);

    if (!hasPermission) {
      await this.logAccessDenial({
        userId,
        role,
        permission,
        resourceId,
        ipAddress,
        reason: `Role ${roleConfig.label} does not have ${permission} permission`,
      });

      return {
        allowed: false,
        reason: `Role ${roleConfig.label} does not have ${permission} permission`,
      };
    }

    return {
      allowed: true,
      reason: `Role ${roleConfig.label} has ${permission} permission${resourceId ? ` on resource ${resourceId}` : ""}`,
    };
  }

  /**
   * Checks whether a user has any of the specified permissions.
   * Returns allowed: true if at least one permission is granted.
   *
   * @param userId - The user's ID.
   * @param role - The user's role.
   * @param permissions - An array of permissions to check.
   * @param resourceId - Optional resource identifier.
   * @param ipAddress - Optional IP address for audit logging.
   * @returns An AccessCheckResult.
   */
  async checkAnyPermission(
    userId: string,
    role: UserRole,
    permissions: Permission[],
    resourceId?: string,
    ipAddress?: string | null
  ): Promise<AccessCheckResult> {
    const roleConfig = ROLES[role];

    if (!roleConfig) {
      await this.logAccessDenial({
        userId,
        role,
        permission: permissions.join(", "),
        resourceId,
        ipAddress,
        reason: `Unknown role: ${role}`,
      });

      return {
        allowed: false,
        reason: `Unknown role: ${role}`,
      };
    }

    const hasAny = permissions.some((perm) =>
      roleConfig.permissions.includes(perm)
    );

    if (!hasAny) {
      await this.logAccessDenial({
        userId,
        role,
        permission: permissions.join(", "),
        resourceId,
        ipAddress,
        reason: `Role ${roleConfig.label} does not have any of the required permissions: ${permissions.join(", ")}`,
      });

      return {
        allowed: false,
        reason: `Role ${roleConfig.label} does not have any of the required permissions: ${permissions.join(", ")}`,
      };
    }

    return {
      allowed: true,
      reason: `Role ${roleConfig.label} has at least one of the required permissions`,
    };
  }

  /**
   * Checks whether a user has all of the specified permissions.
   * Returns allowed: true only if every permission is granted.
   *
   * @param userId - The user's ID.
   * @param role - The user's role.
   * @param permissions - An array of permissions to check.
   * @param resourceId - Optional resource identifier.
   * @param ipAddress - Optional IP address for audit logging.
   * @returns An AccessCheckResult.
   */
  async checkAllPermissions(
    userId: string,
    role: UserRole,
    permissions: Permission[],
    resourceId?: string,
    ipAddress?: string | null
  ): Promise<AccessCheckResult> {
    const roleConfig = ROLES[role];

    if (!roleConfig) {
      await this.logAccessDenial({
        userId,
        role,
        permission: permissions.join(", "),
        resourceId,
        ipAddress,
        reason: `Unknown role: ${role}`,
      });

      return {
        allowed: false,
        reason: `Unknown role: ${role}`,
      };
    }

    const missingPermissions = permissions.filter(
      (perm) => !roleConfig.permissions.includes(perm)
    );

    if (missingPermissions.length > 0) {
      const reason = `Role ${roleConfig.label} is missing permissions: ${missingPermissions.join(", ")}`;

      await this.logAccessDenial({
        userId,
        role,
        permission: permissions.join(", "),
        resourceId,
        ipAddress,
        reason,
      });

      return {
        allowed: false,
        reason,
      };
    }

    return {
      allowed: true,
      reason: `Role ${roleConfig.label} has all required permissions`,
    };
  }

  /**
   * Returns the list of permissions granted to a given role.
   *
   * @param role - The user role.
   * @returns An array of permissions, or an empty array if the role is unknown.
   */
  getPermissionsForRole(role: UserRole): Permission[] {
    const roleConfig = ROLES[role];

    if (!roleConfig) {
      return [];
    }

    return [...roleConfig.permissions];
  }

  /**
   * Checks whether a specific role has a given permission synchronously.
   * Does not log access denials — use checkAccess for audited checks.
   *
   * @param role - The user role.
   * @param permission - The permission to check.
   * @returns true if the role has the permission, false otherwise.
   */
  hasPermission(role: UserRole, permission: Permission): boolean {
    const roleConfig = ROLES[role];

    if (!roleConfig) {
      return false;
    }

    return roleConfig.permissions.includes(permission);
  }

  /**
   * Logs an access denial event via the audit service.
   * Failures to log are caught and re-thrown with context.
   */
  private async logAccessDenial(input: {
    userId: string;
    role: UserRole | string;
    permission: string;
    resourceId?: string;
    ipAddress?: string | null;
    reason: string;
  }): Promise<void> {
    try {
      await auditLogger.logAction({
        userId: input.userId,
        applicationId: input.resourceId ?? null,
        action: "ACCESS_DENIED",
        entityType: "AccessControl",
        entityId: input.resourceId ?? input.userId,
        details: {
          role: input.role,
          permission: input.permission,
          reason: input.reason,
        },
        ipAddress: input.ipAddress ?? null,
        outcome: "DENIED",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to log access denial: ${message}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton Export
// ---------------------------------------------------------------------------

const accessController = new AccessController();

export default accessController;