import { NextResponse } from "next/server";
import { requireDbUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { serializeTask } from "@/lib/recurring";

export async function GET() {
  try {
    const user = await requireDbUser();

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
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load reminder snapshot.",
      },
      { status: 400 }
    );
  }
}