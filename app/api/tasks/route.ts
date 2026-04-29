import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  dayKeyToDate,
  normalizeReminderMode,
  normalizeTaskVisibility,
  normalizeTrackingMode,
  normalizeUrgency,
  serializeTask,
  startOfToday,
  toStoredDate,
} from "@/lib/recurring";

const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(160),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .optional()
    .or(z.literal("")),
  urgency: z.enum(["normal", "important", "deadline"]).default("normal"),
  reminderMode: z
    .enum(["none", "push"])
    .optional()
    .or(z.literal("")),
  trackingMode: z
    .enum(["checkable", "reminder_only"])
    .optional()
    .or(z.literal("")),
  visibility: z.enum(["public", "private"]).optional().or(z.literal("")),
});

async function getDbUser() {
  const session = await auth();

  if (!session?.user?.email) return null;

  return prisma.user.findUnique({
    where: { email: session.user.email },
  });
}

export async function GET() {
  try {
    const user = await getDbUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const tasks = await prisma.task.findMany({
      where: {
        userId: user.id,
        done: false,
        reminderMode: {
          not: "NONE",
        },
      },
      orderBy: [{ date: "asc" }, { time: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({
      ok: true,
      tasks: tasks.map((task) => serializeTask(task, user.id)),
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Failed to load tasks." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getDbUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = createTaskSchema.parse(await request.json());
    const requestedDate = dayKeyToDate(body.date);

    if (requestedDate < startOfToday()) {
      return NextResponse.json(
        { ok: false, error: "You cannot add tasks to past dates." },
        { status: 400 }
      );
    }

    const task = await prisma.task.create({
      data: {
        title: body.title,
        date: toStoredDate(body.date),
        time: body.time || null,
        done: false,
        urgency: normalizeUrgency(body.urgency),
        reminderMode: normalizeReminderMode(body.reminderMode ?? "none"),
        trackingMode: normalizeTrackingMode(body.urgency, body.trackingMode),
        visibility: normalizeTaskVisibility(body.visibility),
        userId: user.id,
      },
    });

    return NextResponse.json({
      ok: true,
      task: serializeTask(task, user.id),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to create task",
      },
      { status: 400 }
    );
  }
}