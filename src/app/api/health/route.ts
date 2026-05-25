import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import type { ApiResponse } from "@/types/types";

interface HealthCheckData {
  status: "ok" | "error";
  timestamp: string;
  database: "connected" | "error";
}

export async function GET(): Promise<NextResponse<ApiResponse<HealthCheckData>>> {
  let databaseStatus: "connected" | "error" = "error";

  try {
    await prisma.$queryRaw`SELECT 1`;
    databaseStatus = "connected";
  } catch {
    databaseStatus = "error";
  }

  const overallStatus = databaseStatus === "connected" ? "ok" : "error";
  const statusCode = overallStatus === "ok" ? 200 : 503;

  const data: HealthCheckData = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    database: databaseStatus,
  };

  return NextResponse.json(
    {
      success: overallStatus === "ok",
      data,
    },
    { status: statusCode }
  );
}