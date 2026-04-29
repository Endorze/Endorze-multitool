import webpush from "web-push";
import { addHours, isSameDay, parse } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import {
  NotificationType,
  ReminderChannel,
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
  const dateInZone = taskDateInZone(task);

  if (!task.time) return null;

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

export async function alreadySent(
  taskId: string,
  type: NotificationType,
  channel: ReminderChannel
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
  channel: ReminderChannel
) {
  try {
    await prisma.notificationLog.create({
      data: { taskId, userId, type, channel },
    });
  } catch {
    // ignore duplicate races
  }
}

export async function sendEmailReminder(
  userEmail: string,
  subject: string,
  html: string
) {
  if (!resend || !process.env.EMAIL_FROM) {
    throw new Error("Email is not configured.");
  }

  await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to: userEmail,
    subject,
    html,
  });
}

export async function sendPushToUser(
  userId: string,
  title: string,
  body: string
) {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  if (!subscriptions.length) return false;

  const payload = JSON.stringify({ title, body, url: "/dashboard" });
  let delivered = false;

  for (const sub of subscriptions) {
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

function wantsPush(mode: ReminderMode) {
  return mode === "PUSH" || mode === "BOTH";
}

function wantsEmail(mode: ReminderMode) {
  return mode === "EMAIL" || mode === "BOTH";
}

export async function processReminders(nowUtc = new Date()) {
  const tasks = await prisma.task.findMany({
    where: {
      done: false,
      user: {
        email: {
          not: "",
        },
      },
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
    const zoneTodayStart = startOfDayInZone(zoneNow, zone);
    const taskDay = taskDateInZone(task);

    const tomorrow = new Date(zoneTodayStart);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (task.urgency === "DEADLINE") {
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
              `<p>You have a deadline tomorrow for <strong>${task.title}</strong>.</p><p>Date: ${taskDay.toDateString()}</p>`
            );

            await logSent(
              task.id,
              task.userId,
              NotificationType.DEADLINE_DAY_BEFORE,
              "EMAIL"
            );

            results.emailsSent += 1;
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

              results.pushesSent += 1;
            }
          }
        }
      }

      if (isSameDay(taskDay, zoneTodayStart)) {
        if (wantsEmail(task.reminderMode)) {
          const exists = await alreadySent(
            task.id,
            NotificationType.DEADLINE_SAME_DAY,
            "EMAIL"
          );

          if (!exists) {
            await sendEmailReminder(
              userEmail,
              `Deadline due today: ${task.title}`,
              `<p><strong>${task.title}</strong> is due today.</p>`
            );

            await logSent(
              task.id,
              task.userId,
              NotificationType.DEADLINE_SAME_DAY,
              "EMAIL"
            );

            results.emailsSent += 1;
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
              "Deadline due today",
              `${task.title} is due today`
            );

            if (pushed) {
              await logSent(
                task.id,
                task.userId,
                NotificationType.DEADLINE_SAME_DAY,
                "PUSH"
              );

              results.pushesSent += 1;
            }
          }
        }
      }
    }

    if (task.time) {
      const dueDateTimeUtc = taskDateTimeUtc(task);

      if (dueDateTimeUtc) {
        const reminderAt = addHours(dueDateTimeUtc, -1);
        const diffMs = Math.abs(nowUtc.getTime() - reminderAt.getTime());
        const withinFiveMinutes = diffMs <= 5 * 60 * 1000;

        if (withinFiveMinutes) {
          if (wantsPush(task.reminderMode)) {
            const pushExists = await alreadySent(
              task.id,
              NotificationType.TIME_ONE_HOUR_BEFORE,
              "PUSH"
            );

            if (!pushExists) {
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

                results.pushesSent += 1;
              }
            }
          }

          if (wantsEmail(task.reminderMode)) {
            const emailExists = await alreadySent(
              task.id,
              NotificationType.TIME_ONE_HOUR_BEFORE,
              "EMAIL"
            );

            if (!emailExists) {
              await sendEmailReminder(
                userEmail,
                `Reminder in 1 hour: ${task.title}`,
                `<p>Your task <strong>${task.title}</strong> starts in 1 hour.</p><p>Time: ${task.time}</p>`
              );

              await logSent(
                task.id,
                task.userId,
                NotificationType.TIME_ONE_HOUR_BEFORE,
                "EMAIL"
              );

              results.emailsSent += 1;
            }
          }
        }
      }
    }
  }

  return results;
}