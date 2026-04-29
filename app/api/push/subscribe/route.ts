import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireDbUser } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
});

export async function POST(request: Request) {
  try {
    const user = await requireDbUser();
    const body = subscriptionSchema.parse(await request.json());

    await prisma.pushSubscription.upsert({
      where: { endpoint: body.endpoint },
      update: {
        p256dh: body.keys.p256dh,
        auth: body.keys.auth,
        userId: user.id,
      },
      create: {
        endpoint: body.endpoint,
        p256dh: body.keys.p256dh,
        auth: body.keys.auth,
        userId: user.id,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Failed' }, { status: 400 });
  }
}
