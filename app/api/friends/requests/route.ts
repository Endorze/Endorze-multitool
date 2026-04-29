import { NextResponse } from "next/server";
import { z } from "zod";
import { requireDbUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

const sendFriendRequestSchema = z.object({
  friendCode: z.string().trim().min(4).max(80),
});

function getFriendshipPair(userIdA: string, userIdB: string) {
  return [userIdA, userIdB].sort();
}

export async function POST(request: Request) {
  try {
    const user = await requireDbUser();
    const body = sendFriendRequestSchema.parse(await request.json());

    const receiver = await prisma.user.findUnique({
      where: {
        friendCode: body.friendCode,
      },
    });

    if (!receiver) {
      return NextResponse.json(
        { ok: false, error: "No user found with that friend code." },
        { status: 404 }
      );
    }

    if (receiver.id === user.id) {
      return NextResponse.json(
        { ok: false, error: "You cannot add yourself." },
        { status: 400 }
      );
    }

    const [userAId, userBId] = getFriendshipPair(user.id, receiver.id);

    const existingFriendship = await prisma.friendship.findUnique({
      where: {
        userAId_userBId: {
          userAId,
          userBId,
        },
      },
    });

    if (existingFriendship) {
      return NextResponse.json(
        { ok: false, error: "You are already friends with this user." },
        { status: 400 }
      );
    }

    const reversePendingRequest = await prisma.friendRequest.findUnique({
      where: {
        senderId_receiverId: {
          senderId: receiver.id,
          receiverId: user.id,
        },
      },
    });

    if (reversePendingRequest?.status === "PENDING") {
      return NextResponse.json(
        {
          ok: false,
          error:
            "This user has already sent you a friend request. Accept their request instead.",
        },
        { status: 400 }
      );
    }

    const existingRequest = await prisma.friendRequest.findUnique({
      where: {
        senderId_receiverId: {
          senderId: user.id,
          receiverId: receiver.id,
        },
      },
    });

    if (existingRequest?.status === "PENDING") {
      return NextResponse.json(
        { ok: false, error: "Friend request already sent." },
        { status: 400 }
      );
    }

    const friendRequest = existingRequest
      ? await prisma.friendRequest.update({
          where: { id: existingRequest.id },
          data: { status: "PENDING" },
          include: {
            receiver: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        })
      : await prisma.friendRequest.create({
          data: {
            senderId: user.id,
            receiverId: receiver.id,
          },
          include: {
            receiver: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        });

    return NextResponse.json({
      ok: true,
      request: {
        id: friendRequest.id,
        receiver: friendRequest.receiver,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Failed to send friend request",
      },
      { status: 400 }
    );
  }
}