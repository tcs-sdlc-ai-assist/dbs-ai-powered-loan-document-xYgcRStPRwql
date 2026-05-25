import prisma from "@/lib/db";
import type { RecommendationType, Prisma } from "@prisma/client";
import type { PaginatedResponse, PaginationParams } from "@/types/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateRecommendationInput {
  applicationId: string;
  recommendation: RecommendationType;
  rationale: string;
  confidence: number;
  createdBy: string;
}

export type RecommendationWithUser = Prisma.RecommendationGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        name: true;
        email: true;
      };
    };
  };
}>;

export type RecommendationWithRelations = Prisma.RecommendationGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        name: true;
        email: true;
      };
    };
    application: true;
  };
}>;

export interface RecommendationListFilters {
  applicationId?: string;
  recommendation?: RecommendationType;
  createdBy?: string;
}

// ---------------------------------------------------------------------------
// Repository Methods
// ---------------------------------------------------------------------------

/**
 * Creates a new recommendation linked to an application.
 */
export async function createRecommendation(input: CreateRecommendationInput) {
  const recommendation = await prisma.recommendation.create({
    data: {
      applicationId: input.applicationId,
      recommendation: input.recommendation,
      rationale: input.rationale,
      confidence: input.confidence,
      createdBy: input.createdBy,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return recommendation;
}

/**
 * Retrieves a recommendation by its internal UUID (primary key).
 */
export async function getRecommendationById(id: string) {
  const recommendation = await prisma.recommendation.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      application: true,
    },
  });

  return recommendation;
}

/**
 * Retrieves all recommendations for a given application,
 * ordered by creation date descending.
 */
export async function getRecommendationsByApplicationId(
  applicationId: string
): Promise<RecommendationWithUser[]> {
  const recommendations = await prisma.recommendation.findMany({
    where: { applicationId },
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
  });

  return recommendations;
}

/**
 * Retrieves the most recent recommendation for a given application.
 * Returns null if no recommendation exists.
 */
export async function getLatestRecommendation(
  applicationId: string
): Promise<RecommendationWithUser | null> {
  const recommendation = await prisma.recommendation.findFirst({
    where: { applicationId },
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
  });

  return recommendation;
}

/**
 * Lists recommendations with pagination and optional filtering
 * by applicationId, recommendation type, or createdBy user.
 */
export async function listRecommendations(
  pagination: PaginationParams,
  filters?: RecommendationListFilters
): Promise<PaginatedResponse<RecommendationWithUser>> {
  const {
    page = 1,
    pageSize = 20,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = pagination;

  const where: Prisma.RecommendationWhereInput = {};

  if (filters?.applicationId) {
    where.applicationId = filters.applicationId;
  }

  if (filters?.recommendation) {
    where.recommendation = filters.recommendation;
  }

  if (filters?.createdBy) {
    where.createdBy = filters.createdBy;
  }

  const skip = (page - 1) * pageSize;

  const [items, total] = await Promise.all([
    prisma.recommendation.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: {
        [sortBy]: sortOrder,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
    prisma.recommendation.count({ where }),
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
 * Returns the count of recommendations grouped by recommendation type
 * for a given application.
 */
export async function getRecommendationCountByType(
  applicationId: string
): Promise<Record<RecommendationType, number>> {
  const counts = await prisma.recommendation.groupBy({
    by: ["recommendation"],
    where: { applicationId },
    _count: {
      recommendation: true,
    },
  });

  const result: Record<string, number> = {
    APPROVE: 0,
    REJECT: 0,
    REFER_TO_ANALYST: 0,
    REQUEST_MORE_INFO: 0,
  };

  for (const entry of counts) {
    result[entry.recommendation] = entry._count.recommendation;
  }

  return result as Record<RecommendationType, number>;
}