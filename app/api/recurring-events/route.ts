import { NextResponse } from "next/server";
import { z } from "zod";

import { requireDbUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import {
  buildRecurringTaskRows,
  normalizeReminderMode,
  normalizeTrackingMode,
  normalizeUrgency,
  serializeRecurringEvent,
  serializeTask,
  startOfToday,
  toStoredDate,
} from "@/lib/recurring";

const recurringSchema = z.object({
  title: z.string().trim().min(1).max(160),
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .optional()
    .or(z.literal("")),
  urgency: z.enum(["normal", "important", "deadline"]).default("normal"),
  reminderMode: z
    .enum(["none", "push", "email", "both"])
    .optional()
    .or(z.literal("")),
  trackingMode: z
    .enum(["checkable", "reminder_only"])
    .optional()
    .or(z.literal("")),
  days: z.array(z.number().int().min(0).max(6)).min(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function POST(request: Request) {
  try {
    const user = await requireDbUser();
    const body = recurringSchema.parse(await request.json());

    const event = await prisma.recurringEvent.create({
      data: {
        title: body.title,
        time: body.time || null,
        urgency: normalizeUrgency(body.urgency),
        reminderMode: normalizeReminderMode(body.reminderMode ?? "none"),
        trackingMode: normalizeTrackingMode(body.urgency, body.trackingMode),
        daysCsv: [...new Set(body.days)].sort((a, b) => a - b).join(","),
        startDate: toStoredDate(body.startDate),
        userId: user.id,
      },
    });

    const rows = buildRecurringTaskRows(event);

    if (rows.length > 0) {
      await prisma.task.createMany({
        data: rows,
      });
    }

    const today = startOfToday();
    const todayKey = `${today.getFullYear()}-${`${today.getMonth() + 1}`.padStart(
      2,
      "0"
    )}-${`${today.getDate()}`.padStart(2, "0")}`;

    const generatedTasks = await prisma.task.findMany({
      where: {
        recurringEventId: event.id,
        date: {
          gte: toStoredDate(todayKey),
        },
      },
      orderBy: [{ date: "asc" }, { time: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({
      ok: true,
      event: serializeRecurringEvent(event),
      tasks: generatedTasks.map(serializeTask),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create recurring event",
      },
      { status: 400 }
    );
  }
}