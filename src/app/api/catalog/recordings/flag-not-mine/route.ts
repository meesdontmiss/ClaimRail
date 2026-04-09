import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { claimTasks, recordings } from "@/lib/db/schema";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const recordingIds = Array.isArray(body?.recordingIds)
      ? body.recordingIds.filter((value: unknown): value is string => typeof value === "string" && value.length > 0)
      : [];
    const releaseLabel = typeof body?.releaseLabel === "string" && body.releaseLabel.trim()
      ? body.releaseLabel.trim()
      : "this release";

    if (recordingIds.length === 0) {
      return NextResponse.json(
        { error: "At least one recording is required." },
        { status: 400 }
      );
    }

    const ownedRecordings = await db.query.recordings.findMany({
      where: and(eq(recordings.userId, user.id), inArray(recordings.id, recordingIds)),
      columns: { id: true },
    });

    if (ownedRecordings.length === 0) {
      return NextResponse.json({ error: "Recording not found" }, { status: 404 });
    }

    const note = `Flagged for platform correction on ${new Date().toISOString().slice(0, 10)}.`;

    await db
      .update(recordings)
      .set({
        ownershipStatus: "not_mine",
        ownershipNote: note,
      })
      .where(and(eq(recordings.userId, user.id), inArray(recordings.id, recordingIds)));

    const taskTitle = `Review platform correction for "${releaseLabel}"`;
    const existingTask = await db.query.claimTasks.findFirst({
      where: and(
        eq(claimTasks.recordingId, ownedRecordings[0].id),
        eq(claimTasks.title, taskTitle)
      ),
      columns: { id: true },
    });

    if (!existingTask) {
      await db.insert(claimTasks).values({
        recordingId: ownedRecordings[0].id,
        title: taskTitle,
        description:
          "ClaimRail flagged this release as not belonging to the artist's catalog. Gather proof, prepare DSP correction details, and automate the platform form-fill or takedown request from this task.",
        status: "pending",
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Flag not mine API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to flag release" },
      { status: 500 }
    );
  }
}
