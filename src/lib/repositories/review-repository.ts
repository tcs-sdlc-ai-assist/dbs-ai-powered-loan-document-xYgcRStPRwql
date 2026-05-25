import prisma from "@/lib/db";
import type { RecommendationType, Prisma } from "@prisma/client";
import type { PaginatedResponse, PaginationParams } from "@/types/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateReviewInput {
  applicationId: string;
  comment: string;
  reviewedBy: string;
}

export interface CreateOverrideInput {
  applicationId: string;
  comment: string;
  overrideRecommendation: RecommendationType;
  justification: string;
  reviewedBy: string;
}

export type ReviewWithReviewer = Prisma.AnalystReviewGetPayload<{
  include: {
    reviewer: {
      select: {
        id: true;
        name: true;
        email: true;
      };
    };
  };
}>;

export type ReviewWithRelations = Prisma.AnalystReviewGetPayload<{
  include: {
    reviewer: {
      select: {
        id: true;
        name: true;
        email: true;
      };
    };
    application: true;
  };
}>;

export interface ReviewListFilters {
  applicationId?: string;
  reviewedBy?: string;
  isOverride?: boolean;
}

// ---------------------------------------------------------------------------
// Repository Methods
// ---------------------------------------------------------------------------

/**
 * Creates a new analyst review (non-override) linked to an application.
 */
export async function createReview(input: CreateReviewInput): Promise<ReviewWithReviewer> {
  const review = await prisma.analystReview.create({
    data: {
      applicationId: input.applicationId,
      comment: input.comment,
      isOverride: false,
      overrideRecommendation: null,
      justification: null,
      reviewedBy: input.reviewedBy,
    },
    include: {
      reviewer: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return review;
}

/**
 * Creates an analyst review with an override recommendation and justification.
 */
export async function createOverride(input: CreateOverrideInput): Promise<ReviewWithReviewer> {
  const review = await prisma.analystReview.create({
    data: {
      applicationId: input.applicationId,
      comment: input.comment,
      isOverride: true,
      overrideRecommendation: input.overrideRecommendation,
      justification: input.justification,
      reviewedBy: input.reviewedBy,
    },
    include: {
      reviewer: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return review;
}

/**
 * Retrieves a single analyst review by its internal UUID (primary key).
 */
export async function getReviewById(id: string): Promise<ReviewWithRelations | null> {
  const review = await prisma.analystReview.findUnique({
    where: { id },
    include: {
      reviewer: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      application: true,
    },
  });

  return review;
}

/**
 * Retrieves all analyst reviews for a given application,
 * ordered by creation date descending.
 */
export async function getReviewsByApplicationId(
  applicationId: string
): Promise<ReviewWithReviewer[]> {
  const reviews = await prisma.analystReview.findMany({
    where: { applicationId },
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
  });

  return reviews;
}

/**
 * Retrieves the most recent analyst review for a given application.
 * Returns null if no review exists.
 */
export async function getLatestReview(
  applicationId: string
): Promise<ReviewWithReviewer | null> {
  const review = await prisma.analystReview.findFirst({
    where: { applicationId },
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
  });

  return review;
}

/**
 * Retrieves all override reviews for a given application,
 * ordered by creation date descending.
 */
export async function getOverridesByApplicationId(
  applicationId: string
): Promise<ReviewWithReviewer[]> {
  const overrides = await prisma.analystReview.findMany({
    where: {
      applicationId,
      isOverride: true,
    },
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
  });

  return overrides;
}

/**
 * Lists analyst reviews with pagination and optional filtering
 * by applicationId, reviewedBy user, or override status.
 */
export async function listReviews(
  pagination: PaginationParams,
  filters?: ReviewListFilters
): Promise<PaginatedResponse<ReviewWithReviewer>> {
  const {
    page = 1,
    pageSize = 20,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = pagination;

  const where: Prisma.AnalystReviewWhereInput = {};

  if (filters?.applicationId) {
    where.applicationId = filters.applicationId;
  }

  if (filters?.reviewedBy) {
    where.reviewedBy = filters.reviewedBy;
  }

  if (filters?.isOverride !== undefined) {
    where.isOverride = filters.isOverride;
  }

  const skip = (page - 1) * pageSize;

  const [items, total] = await Promise.all([
    prisma.analystReview.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: {
        [sortBy]: sortOrder,
      },
      include: {
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
    prisma.analystReview.count({ where }),
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
 * Returns the count of reviews for a given application,
 * optionally filtered by override status.
 */
export async function getReviewCountByApplicationId(
  applicationId: string,
  isOverride?: boolean
): Promise<number> {
  const where: Prisma.AnalystReviewWhereInput = { applicationId };

  if (isOverride !== undefined) {
    where.isOverride = isOverride;
  }

  const count = await prisma.analystReview.count({ where });

  return count;
}