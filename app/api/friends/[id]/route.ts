import { NextResponse } from "next/server";
import { requireDbUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireDbUser();
    const { id } = await context.params;

    const friendship = await prisma.friendship.findFirst({
      where: {
        id,
        OR: [{ userAId: user.id }, { userBId: user.id }],
      },
    });

    if (!friendship) {
      return NextResponse.json(
        { ok: false, error: "Friendship not found." },
        { status: 404 }
      );
    }

    await prisma.friendship.delete({
      where: { id: friendship.id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to remove friend",
      },
      { status: 400 }
    );
  }
}