import { prisma } from "@/lib/prisma";

export async function getAcceptedFriendIds(userId: string) {
  const [friendshipsA, friendshipsB] = await Promise.all([
    prisma.friendship.findMany({
      where: { userAId: userId },
      select: { userBId: true },
    }),

    prisma.friendship.findMany({
      where: { userBId: userId },
      select: { userAId: true },
    }),
  ]);

  return [
    ...friendshipsA.map((friendship) => friendship.userBId),
    ...friendshipsB.map((friendship) => friendship.userAId),
  ];
}