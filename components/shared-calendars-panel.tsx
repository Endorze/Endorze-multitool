"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Clipboard,
  Loader2,
  MailPlus,
  RefreshCw,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import {
  DEMO_FRIEND_CODE,
  demoFriend,
  disableDemoFriend,
  enableDemoFriend,
  isDemoFriendEnabled,
} from "@/lib/demo-shared-calendar";

type FriendUser = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
};

type IncomingRequest = {
  id: string;
  createdAt: string;
  sender: FriendUser;
};

type OutgoingRequest = {
  id: string;
  createdAt: string;
  receiver: FriendUser;
};

type Friend = {
  friendshipId: string;
  createdAt: string;
  user: FriendUser;
};

type FriendsResponse = {
  ok: boolean;
  friendCode?: string;
  incomingRequests?: IncomingRequest[];
  outgoingRequests?: OutgoingRequest[];
  friends?: Friend[];
  error?: string;
};

function displayName(user: FriendUser) {
  return user.name?.trim() || user.email;
}

function initialsFor(user: FriendUser) {
  return displayName(user)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function UserAvatar({ user }: { user: FriendUser }) {
  if (user.image) {
    return (
      <img
        src={user.image}
        alt=""
        className="h-11 w-11 rounded-2xl object-cover"
      />
    );
  }

  return (
    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-cyan-300/15 text-sm font-semibold text-cyan-700 dark:text-cyan-100">
      {initialsFor(user) || "?"}
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[24px] border border-dashed border-[var(--line)] bg-[var(--panel-soft)] px-6 py-10 text-center">
      <p className="font-semibold">{title}</p>
      <p className="mt-2 text-sm theme-muted">{description}</p>
    </div>
  );
}

export default function SharedCalendarsPanel() {
  const [friendCode, setFriendCode] = useState("");
  const [incomingRequests, setIncomingRequests] = useState<IncomingRequest[]>(
    []
  );
  const [outgoingRequests, setOutgoingRequests] = useState<OutgoingRequest[]>(
    []
  );
  const [friends, setFriends] = useState<Friend[]>([]);

  const [codeInput, setCodeInput] = useState("");
  const [status, setStatus] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [busyRequestId, setBusyRequestId] = useState<string | null>(null);
  const [busyFriendshipId, setBusyFriendshipId] = useState<string | null>(null);

  const friendCountLabel = useMemo(() => {
    if (friends.length === 1) return "1 friend";
    return `${friends.length} friends`;
  }, [friends.length]);

  function mergeDemoFriend(serverFriends: Friend[]) {
    if (!isDemoFriendEnabled()) return serverFriends;

    const alreadyHasDemo = serverFriends.some(
      (friend) => friend.friendshipId === demoFriend.friendshipId
    );

    if (alreadyHasDemo) return serverFriends;

    return [demoFriend, ...serverFriends];
  }

  async function loadFriends() {
    setLoading(true);
    setStatus("");

    try {
      const response = await fetch("/api/friends", {
        cache: "no-store",
      });

      const data = (await response.json()) as FriendsResponse;

      if (!response.ok || !data.ok) {
        setStatus(data.error ?? "Could not load friends.");
        return;
      }

      setFriendCode(data.friendCode ?? "");
      setIncomingRequests(data.incomingRequests ?? []);
      setOutgoingRequests(data.outgoingRequests ?? []);
      setFriends(mergeDemoFriend(data.friends ?? []));
    } catch {
      setStatus("Could not load friends.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadFriends();

    function handleDemoFriendChange() {
      void loadFriends();
    }

    window.addEventListener("demo-friend-changed", handleDemoFriendChange);

    return () => {
      window.removeEventListener("demo-friend-changed", handleDemoFriendChange);
    };
  }, []);

  async function copyFriendCode() {
    if (!friendCode) return;

    try {
      await navigator.clipboard.writeText(friendCode);
      setCopied(true);
      setStatus("Friend code copied.");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setStatus("Could not copy friend code.");
    }
  }

  function addDemoFriend() {
    enableDemoFriend();
    setFriends((current) => mergeDemoFriend(current));
    setCodeInput("");
    setStatus("Demo friend added. Go to Calendar to see their red tasks.");
  }

  async function sendFriendRequest() {
    const cleanCode = codeInput.trim();

    if (!cleanCode || sendingRequest) return;

    if (cleanCode.toUpperCase() === DEMO_FRIEND_CODE) {
      addDemoFriend();
      return;
    }

    setSendingRequest(true);
    setStatus("");

    try {
      const response = await fetch("/api/friends/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          friendCode: cleanCode,
        }),
      });

      const data = (await response.json()) as {
        ok: boolean;
        error?: string;
      };

      if (!response.ok || !data.ok) {
        setStatus(data.error ?? "Could not send friend request.");
        return;
      }

      setCodeInput("");
      setStatus("Friend request sent.");
      await loadFriends();
    } catch {
      setStatus("Could not send friend request.");
    } finally {
      setSendingRequest(false);
    }
  }

  async function updateFriendRequest(
    requestId: string,
    action: "accept" | "decline"
  ) {
    setBusyRequestId(requestId);
    setStatus("");

    try {
      const response = await fetch(`/api/friends/requests/${requestId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
        }),
      });

      const data = (await response.json()) as {
        ok: boolean;
        error?: string;
      };

      if (!response.ok || !data.ok) {
        setStatus(data.error ?? "Could not update friend request.");
        return;
      }

      setStatus(
        action === "accept"
          ? "Friend request accepted."
          : "Friend request declined."
      );
      await loadFriends();
    } catch {
      setStatus("Could not update friend request.");
    } finally {
      setBusyRequestId(null);
    }
  }

  async function removeFriend(friendshipId: string) {
    if (friendshipId === demoFriend.friendshipId) {
      disableDemoFriend();
      setFriends((current) =>
        current.filter((friend) => friend.friendshipId !== demoFriend.friendshipId)
      );
      setStatus("Demo friend removed.");
      return;
    }

    setBusyFriendshipId(friendshipId);
    setStatus("");

    try {
      const response = await fetch(`/api/friends/${friendshipId}`, {
        method: "DELETE",
      });

      const data = (await response.json()) as {
        ok: boolean;
        error?: string;
      };

      if (!response.ok || !data.ok) {
        setStatus(data.error ?? "Could not remove friend.");
        return;
      }

      setStatus("Friend removed.");
      await loadFriends();
    } catch {
      setStatus("Could not remove friend.");
    } finally {
      setBusyFriendshipId(null);
    }
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <div className="theme-panel rounded-[32px] p-5 sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm theme-muted">Friend system</p>
            <h2 className="mt-1 text-2xl font-semibold">Shared calendars</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 theme-muted">
              Add trusted friends here. Their public calendar items can appear
              inside your main calendar.
            </p>
          </div>

          <button
            type="button"
            onClick={loadFriends}
            className="theme-button-soft grid h-11 w-11 shrink-0 place-items-center rounded-2xl"
            aria-label="Refresh friends"
            title="Refresh"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <RefreshCw className="h-5 w-5" />
            )}
          </button>
        </div>

        <div className="rounded-[28px] border border-[var(--line)] bg-[var(--panel-soft)] p-4">
          <p className="text-sm theme-muted">Your friend code</p>

          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <div className="theme-input flex min-h-14 min-w-0 flex-1 items-center rounded-2xl px-4 font-mono text-lg font-semibold tracking-wide">
              <span className="truncate">{friendCode || "Loading..."}</span>
            </div>

            <button
              type="button"
              onClick={copyFriendCode}
              disabled={!friendCode}
              className="theme-button-accent inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Clipboard className="h-4 w-4" />
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>

        <div className="mt-5 rounded-[28px] border border-[var(--line)] bg-[var(--panel-soft)] p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo-300/15 text-indigo-700 dark:text-indigo-100">
              <UserPlus className="h-5 w-5" />
            </div>

            <div>
              <h3 className="font-semibold">Add friend</h3>
              <p className="text-sm theme-muted">
                For testing, use{" "}
                <span className="font-mono font-semibold">
                  {DEMO_FRIEND_CODE}
                </span>
                .
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={codeInput}
              onChange={(event) => setCodeInput(event.target.value)}
              placeholder="Paste friend code..."
              className="theme-input h-12 min-w-0 flex-1 rounded-2xl px-4 outline-none"
            />

            <button
              type="button"
              onClick={sendFriendRequest}
              disabled={!codeInput.trim() || sendingRequest}
              className="theme-button-accent inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sendingRequest ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MailPlus className="h-4 w-4" />
              )}
              Send request
            </button>
          </div>

          {status ? (
            <div className="mt-4 rounded-2xl border border-[var(--line)] bg-[var(--panel-strong)] px-4 py-3 text-sm theme-muted">
              {status}
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6">
        <div className="theme-panel rounded-[32px] p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm theme-muted">Incoming</p>
              <h2 className="mt-1 text-2xl font-semibold">Friend requests</h2>
            </div>

            <span className="rounded-full theme-pill px-3 py-2 text-sm theme-muted">
              {incomingRequests.length}
            </span>
          </div>

          {incomingRequests.length === 0 ? (
            <EmptyState
              title="No incoming requests"
              description="When someone adds your code, their request appears here."
            />
          ) : (
            <div className="space-y-3">
              {incomingRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex flex-col gap-4 rounded-[24px] border border-[var(--line)] bg-[var(--panel-soft)] p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <UserAvatar user={request.sender} />

                    <div className="min-w-0">
                      <p className="truncate font-semibold">
                        {displayName(request.sender)}
                      </p>
                      <p className="truncate text-sm theme-muted">
                        {request.sender.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-3">
                    <button
                      type="button"
                      onClick={() => updateFriendRequest(request.id, "accept")}
                      disabled={busyRequestId === request.id}
                      className="inline-flex items-center gap-2 rounded-2xl bg-emerald-300/20 px-4 py-3 text-sm font-semibold text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-emerald-100"
                    >
                      <Check className="h-4 w-4" />
                      Accept
                    </button>

                    <button
                      type="button"
                      onClick={() => updateFriendRequest(request.id, "decline")}
                      disabled={busyRequestId === request.id}
                      className="inline-flex items-center gap-2 rounded-2xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-rose-100"
                    >
                      <X className="h-4 w-4" />
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="theme-panel rounded-[32px] p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm theme-muted">Connected people</p>
              <h2 className="mt-1 text-2xl font-semibold">Friends</h2>
            </div>

            <span className="rounded-full theme-pill px-3 py-2 text-sm theme-muted">
              {friendCountLabel}
            </span>
          </div>

          {friends.length === 0 ? (
            <EmptyState
              title="No friends yet"
              description="Add DEMO-FRIEND to test shared calendar items."
            />
          ) : (
            <div className="space-y-3">
              {friends.map((friend) => (
                <div
                  key={friend.friendshipId}
                  className="flex flex-col gap-4 rounded-[24px] border border-[var(--line)] bg-[var(--panel-soft)] p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <UserAvatar user={friend.user} />

                    <div className="min-w-0">
                      <p className="truncate font-semibold">
                        {displayName(friend.user)}
                      </p>
                      <p className="truncate text-sm theme-muted">
                        {friend.user.email}
                      </p>

                      {friend.friendshipId === demoFriend.friendshipId ? (
                        <p className="mt-1 text-xs text-rose-600 dark:text-rose-200">
                          Color: red · visible in Calendar
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeFriend(friend.friendshipId)}
                    disabled={busyFriendshipId === friend.friendshipId}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-rose-100"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="theme-panel rounded-[32px] p-5 sm:p-6">
          <p className="text-sm theme-muted">How this works</p>
          <h3 className="mt-1 text-lg font-semibold">Combined calendar</h3>
          <p className="mt-2 text-sm leading-6 theme-muted">
            Friend tasks appear directly in your Calendar tab. Demo Friend tasks
            are red, read-only, and marked with their name.
          </p>
        </div>
      </div>
    </section>
  );
}