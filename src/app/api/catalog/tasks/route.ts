import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { claimTasks, recordings } from "@/lib/db/schema";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const recordingId = body?.recordingId as string | undefined;
    const title = body?.title as string | undefined;
    const description = body?.description as string | undefined;

    if (!recordingId || !title || !description) {
      return NextResponse.json(
        { error: "Recording, title, and description are required." },
        { status: 400 }
      );
    }

    const recording = await db.query.recordings.findFirst({
      where: and(eq(recordings.id, recordingId), eq(recordings.userId, user.id)),
      columns: { id: true },
    });

    if (!recording) {
      return NextResponse.json({ error: "Recording not found" }, { status: 404 });
    }

    const [task] = await db.insert(claimTasks).values({
      recordingId,
      title,
      description,
      status: "pending",
    }).returning({
      id: claimTasks.id,
      recordingId: claimTasks.recordingId,
      title: claimTasks.title,
      description: claimTasks.description,
      status: claimTasks.status,
      createdAt: claimTasks.createdDate,
      completedAt: claimTasks.completedAt,
    });

    return NextResponse.json({ success: true, task });
  } catch (error) {
    console.error("Task create API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create task" },
      { status: 500 }
    );
  }
}
