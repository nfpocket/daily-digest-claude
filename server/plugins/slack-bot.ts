import { Chat, type StateAdapter, type Lock, type QueueEntry } from "chat";
import { createSlackAdapter, type SlackAdapter } from "@chat-adapter/slack";
import { readConfig, type ScheduleEntry } from "../utils/config";
import { listDigests } from "../utils/digest";
import { defineNitroPlugin } from "nitropack/runtime";

// Simple in-memory state adapter — sufficient for a single-instance local bot
function createMemoryState(): StateAdapter {
  const cache = new Map<string, { value: unknown; expiresAt: number | null }>();
  const lists = new Map<string, unknown[]>();
  const subscriptions = new Set<string>();
  const locks = new Map<string, Lock>();
  const queues = new Map<string, QueueEntry[]>();

  function isExpired(entry: { expiresAt: number | null }) {
    return entry.expiresAt !== null && Date.now() > entry.expiresAt;
  }

  return {
    async connect() {},
    async disconnect() {},

    async get<T>(key: string): Promise<T | null> {
      const entry = cache.get(key);
      if (!entry || isExpired(entry)) return null;
      return entry.value as T;
    },

    async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
      cache.set(key, { value, expiresAt: ttlMs ? Date.now() + ttlMs : null });
    },

    async delete(key: string): Promise<void> {
      cache.delete(key);
    },

    async setIfNotExists(key: string, value: unknown, ttlMs?: number): Promise<boolean> {
      const entry = cache.get(key);
      if (entry && !isExpired(entry)) return false;
      cache.set(key, { value, expiresAt: ttlMs ? Date.now() + ttlMs : null });
      return true;
    },

    async appendToList(key: string, value: unknown, options?: { maxLength?: number; ttlMs?: number }): Promise<void> {
      const list = lists.get(key) ?? [];
      list.push(value);
      if (options?.maxLength && list.length > options.maxLength) list.splice(0, list.length - options.maxLength);
      lists.set(key, list);
    },

    async getList<T>(key: string): Promise<T[]> {
      return (lists.get(key) ?? []) as T[];
    },

    async subscribe(threadId: string): Promise<void> {
      subscriptions.add(threadId);
    },

    async unsubscribe(threadId: string): Promise<void> {
      subscriptions.delete(threadId);
    },

    async isSubscribed(threadId: string): Promise<boolean> {
      return subscriptions.has(threadId);
    },

    async acquireLock(threadId: string, ttlMs: number): Promise<Lock | null> {
      const existing = locks.get(threadId);
      if (existing && Date.now() < existing.expiresAt) return null;
      const lock: Lock = { threadId, token: Math.random().toString(36).slice(2), expiresAt: Date.now() + ttlMs };
      locks.set(threadId, lock);
      return lock;
    },

    async releaseLock(lock: Lock): Promise<void> {
      const existing = locks.get(lock.threadId);
      if (existing?.token === lock.token) locks.delete(lock.threadId);
    },

    async extendLock(lock: Lock, ttlMs: number): Promise<boolean> {
      const existing = locks.get(lock.threadId);
      if (!existing || existing.token !== lock.token) return false;
      existing.expiresAt = Date.now() + ttlMs;
      return true;
    },

    async forceReleaseLock(threadId: string): Promise<void> {
      locks.delete(threadId);
    },

    async enqueue(threadId: string, entry: QueueEntry, maxSize: number): Promise<number> {
      const queue = queues.get(threadId) ?? [];
      queue.push(entry);
      if (queue.length > maxSize) queue.splice(0, queue.length - maxSize);
      queues.set(threadId, queue);
      return queue.length;
    },

    async dequeue(threadId: string): Promise<QueueEntry | null> {
      const queue = queues.get(threadId);
      if (!queue?.length) return null;
      const entry = queue.shift()!;
      if (Date.now() > entry.expiresAt) return null;
      return entry;
    },

    async queueDepth(threadId: string): Promise<number> {
      return queues.get(threadId)?.length ?? 0;
    },
  };
}

function dayName(d: number) {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d];
}

function nextRunLabel(entry: ScheduleEntry): string {
  const now = new Date();
  const [hh, mm] = entry.time.split(":").map(Number);
  for (let i = 0; i < 8; i++) {
    const candidate = new Date(now);
    candidate.setDate(now.getDate() + i);
    if (!entry.days.includes(candidate.getDay())) continue;
    candidate.setHours(hh, mm, 0, 0);
    if (candidate > now) return candidate.toLocaleString();
  }
  return "not scheduled";
}

// Chunk a long string into pieces under Slack's 12,000-char markdown_text limit
function chunk(text: string, size = 10000): string[] {
  const parts: string[] = [];
  for (let i = 0; i < text.length; i += size) parts.push(text.slice(i, i + size));
  return parts;
}

let _bot: Chat | null = null;

export function getBot(): Chat | null {
  return _bot;
}

export default defineNitroPlugin(async () => {
  const botToken = process.env.SLACK_BOT_TOKEN;
  const appToken = process.env.SLACK_APP_TOKEN;

  if (!botToken || !appToken) {
    console.log("[slack-bot] SLACK_BOT_TOKEN or SLACK_APP_TOKEN not set — bot disabled");
    return;
  }

  const bot = new Chat({
    userName: "daily-digest",
    adapters: {
      slack: createSlackAdapter({ botToken, appToken, mode: "socket" }),
    },
    state: createMemoryState(),
    logger: "warn",
  });

  const suggestedPrompts = [
    { title: "Run digest", message: "run" },
    { title: "Show status", message: "status" },
    { title: "List recent digests", message: "list" },
    { title: "Help", message: "help" },
  ];

  const authorizedUserId = process.env.SLACK_USER_ID;

  function isAuthorized(userId: string) {
    return !authorizedUserId || userId === authorizedUserId;
  }

  bot.onAssistantThreadStarted(async (event) => {
    if (!isAuthorized(event.userId)) return;
    await bot.getState().subscribe(event.threadId);
    const slack = bot.getAdapter("slack") as SlackAdapter;
    await slack.setSuggestedPrompts(event.channelId, event.threadTs, suggestedPrompts);
  });

  bot.onAssistantContextChanged(async (event) => {
    if (!isAuthorized(event.userId)) return;
    const slack = bot.getAdapter("slack") as SlackAdapter;
    await slack.setSuggestedPrompts(event.channelId, event.threadTs, suggestedPrompts);
  });

  async function handleCommand(thread: { post: any; startTyping: any }, text: string) {
    const args = text.trim().toLowerCase().split(/\s+/);
    const cmd = args[0];

    if (cmd === "help" || !cmd) {
      await thread.startTyping("Looking up commands…");
      await thread.post({
        markdown: [
          "*Daily Digest Bot*",
          "`run [schedule]` — run a digest now",
          "`status` — show schedules and next run times",
          "`list` — show the last 5 digests",
          "`help` — show this message",
        ].join("\n"),
      });
      return;
    }

    if (cmd === "status") {
      await thread.startTyping("Reading schedules…");
      const config = await readConfig();
      if (config.schedules.length === 0) {
        await thread.post("No schedules configured.");
        return;
      }
      const lines = config.schedules.map((s: ScheduleEntry) => {
        const days = s.days.map(dayName).join(", ");
        return `*${s.name}* — ${days} at ${s.time}\nNext: ${nextRunLabel(s)}`;
      });
      await thread.post({ markdown: lines.join("\n\n") });
      return;
    }

    if (cmd === "list") {
      await thread.startTyping("Loading digests…");
      const digests = await listDigests();
      const recent = digests.slice(0, 5);
      if (recent.length === 0) {
        await thread.post("No digests yet.");
        return;
      }
      const lines = recent.map((d: any) => `• ${d.date}${d.scheduleName ? ` — ${d.scheduleName}` : ""}`);
      await thread.post({ markdown: lines.join("\n") });
      return;
    }

    if (cmd === "run") {
      const config = await readConfig();
      const nameArg = args.slice(1).join(" ").toLowerCase();
      let entry = config.schedules.find((s: ScheduleEntry) => s.name.toLowerCase() === nameArg);
      if (!entry && config.schedules.length === 1) entry = config.schedules[0];
      if (!entry) {
        const names = config.schedules.map((s: ScheduleEntry) => `\`${s.name}\``).join(", ");
        await thread.post({ markdown: `Unknown schedule. Available: ${names}` });
        return;
      }

      let phase = "Fetching sources…";
      await thread.startTyping(phase);

      const typingInterval = setInterval(() => {
        thread.startTyping(phase).catch(() => {});
      }, 4000);

      try {
        const { runDigest } = await import("../utils/digest");
        const filepath = await runDigest(
          entry.id,
          (event: any) => {
            if (event.type === "phase") {
              phase = event.message;
              thread.startTyping(phase).catch(() => {});
            }
          },
          "manual",
          { skipNotifications: true },
        );
        clearInterval(typingInterval);
        const { readFile } = await import("node:fs/promises");
        const matter = await import("gray-matter");
        const raw = await readFile(filepath, "utf-8");
        const content = matter.default(raw).content.trimStart();
        for (const part of chunk(content)) {
          await thread.post({ markdown: part });
        }
      } catch (err: any) {
        clearInterval(typingInterval);
        await thread.post(`Run failed: ${err?.message ?? err}`);
      }
      return;
    }

    await thread.post({ markdown: `Unknown command: \`${cmd}\`. Type \`help\` for options.` });
  }

  bot.onSubscribedMessage(async (thread, message) => {
    if (!isAuthorized(message.author.userId)) return;
    await handleCommand(thread, message.text ?? "");
  });

  bot.onDirectMessage(async (thread, message) => {
    if (!isAuthorized(message.author.userId)) return;
    await handleCommand(thread, message.text ?? "");
  });

  await bot.initialize();
  _bot = bot;
  console.log("[slack-bot] Started in socket mode");
});
