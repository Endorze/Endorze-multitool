import { NextResponse } from "next/server";
import { z } from "zod";

import { requireDbUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import {
  buildRecurringTaskRows,
  normalizeReminderMode,
  normalizeTaskVisibility,
  normalizeTrackingMode,
  normalizeUrgency,
  serializeRecurringEvent,
  serializeTask,
  startOfToday,
  toDayKey,
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
  visibility: z.enum(["public", "private"]).optional().or(z.literal("")),
  days: z.array(z.number().int().min(0).max(6)).min(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireDbUser();
    const { id } = await context.params;
    const body = recurringSchema.parse(await request.json());

    const existing = await prisma.recurringEvent.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Recurring event not found" },
        { status: 404 }
      );
    }

    const todayKey = toDayKey(startOfToday());

    const deletedFutureTasks = await prisma.task.findMany({
      where: {
        recurringEventId: existing.id,
        date: {
          gte: toStoredDate(todayKey),
        },
      },
      select: { id: true },
    });

    await prisma.task.deleteMany({
      where: {
        recurringEventId: existing.id,
        date: {
          gte: toStoredDate(todayKey),
        },
      },
    });

    const updated = await prisma.recurringEvent.update({
      where: { id: existing.id },
      data: {
        title: body.title,
        time: body.time || null,
        urgency: normalizeUrgency(body.urgency),
        reminderMode: normalizeReminderMode(body.reminderMode),
        trackingMode: normalizeTrackingMode(body.urgency, body.trackingMode),
        visibility: normalizeTaskVisibility(body.visibility),
        daysCsv: [...new Set(body.days)].sort((a, b) => a - b).join(","),
        startDate: toStoredDate(body.startDate),
      },
    });

    const rows = buildRecurringTaskRows(updated);

    if (rows.length > 0) {
      await prisma.task.createMany({
        data: rows,
      });
    }

    const generatedTasks = await prisma.task.findMany({
      where: {
        recurringEventId: updated.id,
        date: {
          gte: toStoredDate(todayKey),
        },
      },
      orderBy: [{ date: "asc" }, { time: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({
      ok: true,
      event: serializeRecurringEvent(updated),
      deletedTaskIds: deletedFutureTasks.map((task) => task.id),
      tasks: generatedTasks.map((task) => serializeTask(task, user.id)),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update recurring event",
      },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireDbUser();
    const { id } = await context.params;

    const existing = await prisma.recurringEvent.findFirst({
      where: {
        id,
        userId: user.id,
      },
      include: {
        tasks: {
          select: { id: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Recurring event not found" },
        { status: 404 }
      );
    }

    const deletedTaskIds = existing.tasks.map((task) => task.id);

    await prisma.recurringEvent.delete({
      where: { id: existing.id },
    });

    return NextResponse.json({
      ok: true,
      deletedTaskIds,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete recurring event",
      },
      { status: 400 }
    );
  }
}