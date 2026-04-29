import webpush from "web-push";
import { addHours, isSameDay, parse } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import {
  NotificationType,
  ReminderMode,
  Task,
  User,
} from "@prisma/client";
import { Resend } from "resend";

import { prisma } from "@/lib/prisma";

type TaskWithUser = Task & { user: User };

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const vapidPublicKey =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT;

if (vapidPublicKey && vapidPrivateKey && vapidSubject) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

// --------------------
// HELPERS
// --------------------

function getTimeZone(user: User) {
  return user.timeZone || "UTC";
}

function startOfDayInZone(date: Date, timeZone: string) {
  const zoned = toZonedTime(date, timeZone);
  zoned.setHours(0, 0, 0, 0);
  return zoned;
}

function taskDateInZone(task: TaskWithUser) {
  return toZonedTime(task.date, getTimeZone(task.user));
}

function taskDateTimeUtc(task: TaskWithUser) {
  if (!task.time) return null;

  const dateInZone = taskDateInZone(task);

  const datePart = `${dateInZone.getFullYear()}-${String(
    dateInZone.getMonth() + 1
  ).padStart(2, "0")}-${String(dateInZone.getDate()).padStart(2, "0")}`;

  const localDateTime = parse(
    `${datePart} ${task.time}`,
    "yyyy-MM-dd HH:mm",
    new Date()
  );

  return fromZonedTime(localDateTime, getTimeZone(task.user));
}

// --------------------
// LOGGING
// --------------------

export async function alreadySent(
  taskId: string,
  type: NotificationType,
  channel: "EMAIL" | "PUSH"
) {
  return prisma.notificationLog.findUnique({
    where: {
      taskId_type_channel: {
        taskId,
        type,
        channel,
      },
    },
  });
}

export async function logSent(
  taskId: string,
  userId: string,
  type: NotificationType,
  channel: "EMAIL" | "PUSH"
) {
  try {
    await prisma.notificationLog.create({
      data: { taskId, userId, type, channel },
    });
  } catch {
    // ignore duplicates
  }
}

// --------------------
// SENDERS
// --------------------

async function sendEmailReminder(
  userEmail: string,
  subject: string,
  html: string
) {
  if (!resend || !process.env.EMAIL_FROM) return;

  await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to: userEmail,
    subject,
    html,
  });
}

async function sendPushToUser(
  userId: string,
  title: string,
  body: string
) {
  const subs = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  if (!subs.length) return false;

  const payload = JSON.stringify({ title, body, url: "/dashboard" });

  let delivered = false;

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        payload
      );
      delivered = true;
    } catch {
      await prisma.pushSubscription
        .delete({ where: { endpoint: sub.endpoint } })
        .catch(() => null);
    }
  }

  return delivered;
}

// --------------------
// CHANNEL CHECKS
// --------------------

function wantsPush(mode: ReminderMode) {
  return mode === "PUSH" || mode === "BOTH";
}

function wantsEmail(mode: ReminderMode) {
  return mode === "EMAIL" || mode === "BOTH";
}

// --------------------
// MAIN
// --------------------

export async function processReminders(nowUtc = new Date()) {
  const tasks = await prisma.task.findMany({
    where: {
      done: false,
      reminderMode: {
        not: "NONE",
      },
    },
    include: { user: true },
  });

  const results = {
    checked: tasks.length,
    emailsSent: 0,
    pushesSent: 0,
  };

  for (const task of tasks) {
    const userEmail = task.user.email;
    if (!userEmail) continue;

    const zone = getTimeZone(task.user);
    const zoneNow = toZonedTime(nowUtc, zone);
    const todayStart = startOfDayInZone(zoneNow, zone);
    const taskDay = taskDateInZone(task);

    const tomorrow = new Date(todayStart);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // ---------------- DEADLINE ----------------

    if (task.urgency === "DEADLINE") {
      // DAY BEFORE
      if (isSameDay(taskDay, tomorrow)) {
        if (wantsEmail(task.reminderMode)) {
          const exists = await alreadySent(
            task.id,
            NotificationType.DEADLINE_DAY_BEFORE,
            "EMAIL"
          );

          if (!exists) {
            await sendEmailReminder(
              userEmail,
              `Deadline tomorrow: ${task.title}`,
              `<p>${task.title} is due tomorrow.</p>`
            );

            await logSent(
              task.id,
              task.userId,
              NotificationType.DEADLINE_DAY_BEFORE,
              "EMAIL"
            );

            results.emailsSent++;
          }
        }

        if (wantsPush(task.reminderMode)) {
          const exists = await alreadySent(
            task.id,
            NotificationType.DEADLINE_DAY_BEFORE,
            "PUSH"
          );

          if (!exists) {
            const pushed = await sendPushToUser(
              task.userId,
              "Deadline tomorrow",
              `${task.title} is due tomorrow`
            );

            if (pushed) {
              await logSent(
                task.id,
                task.userId,
                NotificationType.DEADLINE_DAY_BEFORE,
                "PUSH"
              );
              results.pushesSent++;
            }
          }
        }
      }

      // SAME DAY
      if (isSameDay(taskDay, todayStart)) {
        if (wantsEmail(task.reminderMode)) {
          const exists = await alreadySent(
            task.id,
            NotificationType.DEADLINE_SAME_DAY,
            "EMAIL"
          );

          if (!exists) {
            await sendEmailReminder(
              userEmail,
              `Due today: ${task.title}`,
              `<p>${task.title} is due today.</p>`
            );

            await logSent(
              task.id,
              task.userId,
              NotificationType.DEADLINE_SAME_DAY,
              "EMAIL"
            );

            results.emailsSent++;
          }
        }

        if (wantsPush(task.reminderMode)) {
          const exists = await alreadySent(
            task.id,
            NotificationType.DEADLINE_SAME_DAY,
            "PUSH"
          );

          if (!exists) {
            const pushed = await sendPushToUser(
              task.userId,
              "Due today",
              `${task.title} is due today`
            );

            if (pushed) {
              await logSent(
                task.id,
                task.userId,
                NotificationType.DEADLINE_SAME_DAY,
                "PUSH"
              );
              results.pushesSent++;
            }
          }
        }
      }
    }

    // ---------------- TIME ----------------

    if (task.time) {
      const dueUtc = taskDateTimeUtc(task);

      if (!dueUtc) continue;

      const reminderAt = addHours(dueUtc, -1);
      const diff = Math.abs(nowUtc.getTime() - reminderAt.getTime());

      if (diff <= 5 * 60 * 1000) {
        if (wantsPush(task.reminderMode)) {
          const exists = await alreadySent(
            task.id,
            NotificationType.TIME_ONE_HOUR_BEFORE,
            "PUSH"
          );

          if (!exists) {
            const pushed = await sendPushToUser(
              task.userId,
              "Task coming up",
              `In 1 hour: ${task.title}`
            );

            if (pushed) {
              await logSent(
                task.id,
                task.userId,
                NotificationType.TIME_ONE_HOUR_BEFORE,
                "PUSH"
              );
              results.pushesSent++;
            }
          }
        }

        if (wantsEmail(task.reminderMode)) {
          const exists = await alreadySent(
            task.id,
            NotificationType.TIME_ONE_HOUR_BEFORE,
            "EMAIL"
          );

          if (!exists) {
            await sendEmailReminder(
              userEmail,
              `In 1 hour: ${task.title}`,
              `<p>${task.title} starts in 1 hour.</p>`
            );

            await logSent(
              task.id,
              task.userId,
              NotificationType.TIME_ONE_HOUR_BEFORE,
              "EMAIL"
            );

            results.emailsSent++;
          }
        }
      }
    }
  }

  return results;
}