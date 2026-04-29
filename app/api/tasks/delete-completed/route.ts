import { NextResponse } from "next/server";
import { z } from "zod";

import { requireDbUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { toStoredDate } from "@/lib/recurring";

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function DELETE(request: Request) {
  try {
    const user = await requireDbUser();
    const body = schema.parse(await request.json());

    const result = await prisma.task.deleteMany({
      where: {
        userId: user.id,
        date: toStoredDate(body.date),
        done: true,
      },
    });

    return NextResponse.json({
      ok: true,
      deletedCount: result.count,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete completed tasks",
      },
      { status: 400 }
    );
  }
}