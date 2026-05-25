import prisma from "@/lib/db";
import { generateApplicationId } from "@/lib/utils";
import type { ApplicationStatusEnum, Prisma } from "@prisma/client";
import type { PaginatedResponse, PaginationParams } from "@/types/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateApplicationInput {
  applicantName: string;
  loanType: string;
  loanAmount: number;
}

export interface UpdateApplicantInput {
  applicantName?: string;
  loanType?: string;
  loanAmount?: number;
  status?: ApplicationStatusEnum;
}

export interface ApplicationListFilters {
  status?: ApplicationStatusEnum;
  loanType?: string;
  search?: string;
}

// ---------------------------------------------------------------------------
// Application with relations type
// ---------------------------------------------------------------------------

export type ApplicationWithRelations = Prisma.ApplicationGetPayload<{
  include: {
    documents: {
      include: {
        extractionResult: true;
      };
    };
    validationDiscrepancies: true;
    recommendations: {
      include: {
        user: {
          select: {
            id: true;
            name: true;
            email: true;
          };
        };
      };
    };
    analystReviews: {
      include: {
        reviewer: {
          select: {
            id: true;
            name: true;
            email: true;
          };
        };
      };
    };
    applicationStatusHistory: true;
  };
}>;

// ---------------------------------------------------------------------------
// Repository Methods
// ---------------------------------------------------------------------------

/**
 * Creates a new application with a unique DBS-XXXX application ID.
 * Retries up to 5 times if the generated ID collides with an existing record.
 */
export async function createApplication(input: CreateApplicationInput) {
  const maxRetries = 5;
  let attempt = 0;

  while (attempt < maxRetries) {
    const applicationId = generateApplicationId();

    const existing = await prisma.application.findUnique({
      where: { applicationId },
    });

    if (existing) {
      attempt++;
      continue;
    }

    const application = await prisma.application.create({
      data: {
        applicationId,
        applicantName: input.applicantName,
        loanType: input.loanType,
        loanAmount: input.loanAmount,
        status: "DRAFT",
      },
    });

    return application;
  }

  throw new Error("Failed to generate a unique application ID after multiple attempts");
}

/**
 * Retrieves an application by its internal UUID (primary key).
 */
export async function getApplicationById(id: string) {
  const application = await prisma.application.findUnique({
    where: { id },
  });

  return application;
}

/**
 * Retrieves an application by its human-readable application ID (e.g. DBS-1001).
 */
export async function getApplicationByApplicationId(applicationId: string) {
  const application = await prisma.application.findUnique({
    where: { applicationId },
  });

  return application;
}

/**
 * Updates applicant details on an existing application.
 */
export async function updateApplicantDetails(
  id: string,
  input: UpdateApplicantInput
) {
  const data: Prisma.ApplicationUpdateInput = {};

  if (input.applicantName !== undefined) {
    data.applicantName = input.applicantName;
  }
  if (input.loanType !== undefined) {
    data.loanType = input.loanType;
  }
  if (input.loanAmount !== undefined) {
    data.loanAmount = input.loanAmount;
  }
  if (input.status !== undefined) {
    data.status = input.status;
  }

  const application = await prisma.application.update({
    where: { id },
    data,
  });

  return application;
}

/**
 * Lists applications with pagination, optional status/loanType filtering,
 * and optional search by applicantName or applicationId.
 */
export async function listApplications(
  pagination: PaginationParams,
  filters?: ApplicationListFilters
): Promise<PaginatedResponse<Prisma.ApplicationGetPayload<object>>> {
  const {
    page = 1,
    pageSize = 20,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = pagination;

  const where: Prisma.ApplicationWhereInput = {};

  if (filters?.status) {
    where.status = filters.status;
  }

  if (filters?.loanType) {
    where.loanType = filters.loanType;
  }

  if (filters?.search) {
    where.OR = [
      {
        applicantName: {
          contains: filters.search,
          mode: "insensitive",
        },
      },
      {
        applicationId: {
          contains: filters.search,
          mode: "insensitive",
        },
      },
    ];
  }

  const skip = (page - 1) * pageSize;

  const [items, total] = await Promise.all([
    prisma.application.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: {
        [sortBy]: sortOrder,
      },
    }),
    prisma.application.count({ where }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

/**
 * Retrieves an application with all related entities:
 * documents (with extraction results), validation discrepancies,
 * recommendations (with user), analyst reviews (with reviewer),
 * and application status history.
 */
export async function getApplicationWithRelations(
  id: string
): Promise<ApplicationWithRelations | null> {
  const application = await prisma.application.findUnique({
    where: { id },
    include: {
      documents: {
        include: {
          extractionResult: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      validationDiscrepancies: {
        orderBy: {
          createdAt: "desc",
        },
      },
      recommendations: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      analystReviews: {
        include: {
          reviewer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      applicationStatusHistory: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  return application;
}