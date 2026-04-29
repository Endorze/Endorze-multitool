import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

function serializeReminderMode(value: "NONE" | "PUSH" | "EMAIL" | "BOTH") {
  if (value === "PUSH") return "push";
  if (value === "EMAIL") return "email";
  if (value === "BOTH") return "both";
  return "none";
}

function serializeUrgency(value: "NORMAL" | "IMPORTANT" | "DEADLINE") {
  if (value === "IMPORTANT") return "important";
  if (value === "DEADLINE") return "deadline";
  return "normal";
}

export async function GET() {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ ok: false, tasks: [] }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    return NextResponse.json({ ok: false, tasks: [] }, { status: 401 });
  }

  const tasks = await prisma.task.findMany({
    where: {
      userId: user.id,
      done: false,
      reminderMode: {
        in: ["PUSH", "BOTH"],
      },
    },
    orderBy: [{ date: "asc" }, { time: "asc" }],
  });

  return NextResponse.json({
    ok: true,
    tasks: tasks.map((task) => ({
      id: task.id,
      title: task.title,
      date: task.date.toISOString().slice(0, 10),
      time: task.time ?? "",
      done: task.done,
      urgency: serializeUrgency(task.urgency),
      reminderChannel: serializeReminderMode(task.reminderMode),
    })),
  });
}