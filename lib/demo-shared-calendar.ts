import { toDayKey } from "@/lib/recurring";

export const DEMO_FRIEND_CODE = "DEMO-FRIEND";
export const DEMO_FRIEND_STORAGE_KEY = "task-calendar-demo-friend-enabled";

export type DemoFriend = {
  friendshipId: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
};

export type DemoSharedTask = {
  id: string;
  title: string;
  date: string;
  time: string;
  done: boolean;
  urgency: "normal" | "important" | "deadline";
  trackingMode: "reminder_only";
  visibility: "public";
  ownerId: string;
  ownerName: string;
  ownerColor: "red";
  readonly: true;
};

export const demoFriend: DemoFriend = {
  friendshipId: "demo-friendship",
  createdAt: new Date().toISOString(),
  user: {
    id: "demo-user",
    name: "Demo Friend",
    email: "demo.friend@example.com",
    image: null,
  },
};

function todayAtNoon() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
}

function addDays(amount: number) {
  const date = todayAtNoon();
  date.setDate(date.getDate() + amount);
  return toDayKey(date);
}

export function isDemoFriendEnabled() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(DEMO_FRIEND_STORAGE_KEY) === "true";
}

export function enableDemoFriend() {
  window.localStorage.setItem(DEMO_FRIEND_STORAGE_KEY, "true");
  window.dispatchEvent(new Event("demo-friend-changed"));
}

export function disableDemoFriend() {
  window.localStorage.removeItem(DEMO_FRIEND_STORAGE_KEY);
  window.dispatchEvent(new Event("demo-friend-changed"));
}

export function getDemoSharedTasks(): DemoSharedTask[] {
  if (!isDemoFriendEnabled()) return [];

  return [
    {
      id: "demo-task-1",
      title: "Grocery shopping",
      date: addDays(0),
      time: "16:30",
      done: false,
      urgency: "normal",
      trackingMode: "reminder_only",
      visibility: "public",
      ownerId: demoFriend.user.id,
      ownerName: demoFriend.user.name,
      ownerColor: "red",
      readonly: true,
    },
    {
      id: "demo-task-2",
      title: "Family dinner",
      date: addDays(0),
      time: "19:00",
      done: false,
      urgency: "important",
      trackingMode: "reminder_only",
      visibility: "public",
      ownerId: demoFriend.user.id,
      ownerName: demoFriend.user.name,
      ownerColor: "red",
      readonly: true,
    },
    {
      id: "demo-task-3",
      title: "Dentist appointment",
      date: addDays(1),
      time: "09:15",
      done: false,
      urgency: "deadline",
      trackingMode: "reminder_only",
      visibility: "public",
      ownerId: demoFriend.user.id,
      ownerName: demoFriend.user.name,
      ownerColor: "red",
      readonly: true,
    },
    {
      id: "demo-task-4",
      title: "Pick up package",
      date: addDays(3),
      time: "13:00",
      done: false,
      urgency: "normal",
      trackingMode: "reminder_only",
      visibility: "public",
      ownerId: demoFriend.user.id,
      ownerName: demoFriend.user.name,
      ownerColor: "red",
      readonly: true,
    },
  ];
}