import { NextResponse } from 'next/server';

import { requireDbUser } from '@/lib/auth-helpers';
import { sendPushToUser } from '@/lib/notifications';

export async function POST() {
  try {
    const user = await requireDbUser();
    const delivered = await sendPushToUser(user.id, 'Push is working', 'Your browser can receive timed task reminders.');

    return NextResponse.json({
      ok: delivered,
      message: delivered ? 'Test push sent.' : 'No active push subscription found.',
    });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : 'Failed' }, { status: 400 });
  }
}
