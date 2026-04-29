import { NextResponse } from "next/server";
import { z } from "zod";
import { requireDbUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

const requestActionSchema = z.object({
  action: z.enum(["accept", "decline"]),
});

function getFriendshipPair(userIdA: string, userIdB: string) {
  return [userIdA, userIdB].sort();
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireDbUser();
    const { id } = await context.params;
    const body = requestActionSchema.parse(await request.json());

    const friendRequest = await prisma.friendRequest.findFirst({
      where: {
        id,
        receiverId: user.id,
        status: "PENDING",
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    if (!friendRequest) {
      return NextResponse.json(
        { ok: false, error: "Friend request not found." },
        { status: 404 }
      );
    }

    if (body.action === "decline") {
      await prisma.friendRequest.update({
        where: { id: friendRequest.id },
        data: { status: "DECLINED" },
      });

      return NextResponse.json({ ok: true });
    }

    const [userAId, userBId] = getFriendshipPair(
      friendRequest.senderId,
      friendRequest.receiverId
    );

    await prisma.$transaction([
      prisma.friendRequest.update({
        where: { id: friendRequest.id },
        data: { status: "ACCEPTED" },
      }),

      prisma.friendship.upsert({
        where: {
          userAId_userBId: {
            userAId,
            userBId,
          },
        },
        update: {},
        create: {
          userAId,
          userBId,
        },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      friend: friendRequest.sender,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Failed to update request",
      },
      { status: 400 }
    );
  }
}