import { NextResponse } from "next/server";
import { requireDbUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

function serializeUser(user: {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
  };
}

export async function GET() {
  try {
    const user = await requireDbUser();

    const [incomingRequests, outgoingRequests, friendshipsA, friendshipsB] =
      await Promise.all([
        prisma.friendRequest.findMany({
          where: {
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
          orderBy: { createdAt: "desc" },
        }),

        prisma.friendRequest.findMany({
          where: {
            senderId: user.id,
            status: "PENDING",
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
          orderBy: { createdAt: "desc" },
        }),

        prisma.friendship.findMany({
          where: {
            userAId: user.id,
          },
          include: {
            userB: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        }),

        prisma.friendship.findMany({
          where: {
            userBId: user.id,
          },
          include: {
            userA: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
      ]);

    return NextResponse.json({
      ok: true,
      friendCode: user.friendCode,
      incomingRequests: incomingRequests.map((request) => ({
        id: request.id,
        createdAt: request.createdAt.toISOString(),
        sender: serializeUser(request.sender),
      })),
      outgoingRequests: outgoingRequests.map((request) => ({
        id: request.id,
        createdAt: request.createdAt.toISOString(),
        receiver: serializeUser(request.receiver),
      })),
      friends: [
        ...friendshipsA.map((friendship) => ({
          friendshipId: friendship.id,
          createdAt: friendship.createdAt.toISOString(),
          user: serializeUser(friendship.userB),
        })),
        ...friendshipsB.map((friendship) => ({
          friendshipId: friendship.id,
          createdAt: friendship.createdAt.toISOString(),
          user: serializeUser(friendship.userA),
        })),
      ],
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to load friends",
      },
      { status: 400 }
    );
  }
}