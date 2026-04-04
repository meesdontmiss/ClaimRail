import { NextResponse } from "next/server";
import { desc, gt } from "drizzle-orm";
import { db } from "@/lib/db";
import { authDebugEvents } from "@/lib/db/schema";

export async function GET() {
  try {
    const cutoff = new Date(Date.now() - 30 * 60 * 1000);
    const event = await db.query.authDebugEvents.findFirst({
      where: gt(authDebugEvents.createdAt, cutoff),
      orderBy: [desc(authDebugEvents.createdAt)],
    });

    return NextResponse.json({ event: event ?? null });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to load auth debug event",
      },
      { status: 500 }
    );
  }
}
