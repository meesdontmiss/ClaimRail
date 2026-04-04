import { NextResponse } from "next/server";
import { desc, gt } from "drizzle-orm";
import { db } from "@/lib/db";
import { authDebugEvents } from "@/lib/db/schema";
import { getDatabaseRuntimeSummary, serializeRuntimeError } from "@/lib/runtime-diagnostics";

export async function GET() {
  try {
    const cutoff = new Date(Date.now() - 30 * 60 * 1000);
    const event = await db.query.authDebugEvents.findFirst({
      where: gt(authDebugEvents.createdAt, cutoff),
      orderBy: [desc(authDebugEvents.createdAt)],
    });

    return NextResponse.json({ event: event ?? null });
  } catch (error) {
    const dbSummary = getDatabaseRuntimeSummary();
    const runtimeError = serializeRuntimeError(error);
    console.error("Auth debug latest route failed:", {
      dbSummary,
      runtimeError,
    });

    return NextResponse.json(
      {
        event: null,
        unavailable: true,
        error: error instanceof Error ? error.message : "Failed to load auth debug event",
        debug: {
          dbSummary,
          runtimeError,
        },
      },
      { status: 200 }
    );
  }
}
