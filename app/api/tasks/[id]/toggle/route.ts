import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { serializeTask } from "@/lib/recurring";

async function getDbUser() {
  const session = await auth();

  if (!session?.user?.email) {
    return null;
  }

  return prisma.user.findUnique({
    where: { email: session.user.email },
  });
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getDbUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    const existingTask = await prisma.task.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!existingTask) {
      return NextResponse.json(
        { ok: false, error: "Task not found" },
        { status: 404 }
      );
    }

    if (existingTask.trackingMode === "REMINDER_ONLY") {
      return NextResponse.json({
        ok: true,
        task: serializeTask(existingTask),
      });
    }

    const updatedTask = await prisma.task.update({
      where: { id: existingTask.id },
      data: {
        done: !existingTask.done,
      },
    });

    return NextResponse.json({
      ok: true,
      task: serializeTask(updatedTask),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to update task",
      },
      { status: 400 }
    );
  }
}