import { writeFile, mkdir, readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { runWithCLI } from "./claude";
import { sendNotifications } from "./notify";
import { digestsDir, readConfig, type ScheduleEntry } from "./config";
import { getConnector } from "../connectors/index";

export type DigestTrigger = "manual" | "scheduled";

export type DigestEvent =
  | { type: "phase"; message: string }
  | { type: "done"; filepath: string }
  | { type: "error"; message: string };

function formatTimestamp(date: Date): string {
  return date.toISOString().slice(0, 16).replace("T", "-").replace(":", "-");
}

function buildPrompt(entry: ScheduleEntry, sourceBlocks: string, customPrompt: string | null): string {
  const date = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const base =
    customPrompt ??
    `Generate a structured digest in this exact format:

# Digest — ${date}

## Needs Your Attention
[2-5 bullet points of items that require the user's action, response, or decision. If none, write "Nothing urgent."]

## [Source Name]
[5-10 bullet points summarizing the most important activity. Include author names where relevant.]

Be concise. Focus on signal over noise. Skip pleasantries and filler messages.
When source items include [(source)](url) links, preserve them in your bullet points. For each bullet include all relevant source links as [(1)](url) [(2)](url) etc.`;

  const dataSection = sourceBlocks.trim()
    ? `\n\n---\nRAW DATA:\n${sourceBlocks}\n---`
    : "";

  return `${base}${dataSection}`;
}

export async function runDigest(
  entryId: string,
  onEvent?: (event: DigestEvent) => void,
  trigger: DigestTrigger = "manual",
): Promise<string> {
  const config = await readConfig();
  const entry = config.schedules.find((s) => s.id === entryId);
  if (!entry) throw new Error(`Schedule entry not found: ${entryId}`);

  if (entry.sources.length === 0 && !entry.prompt) {
    throw new Error(`Schedule entry "${entry.name}" has no sources and no custom prompt.`);
  }

  const since = await getLastDigestTime();

  const sourceBlocks: string[] = [];

  if (entry.sources.length > 0) {
    onEvent?.({ type: "phase", message: "Fetching sources…" });

    const fetchErrors: string[] = [];

    for (const source of entry.sources) {
      const connector = getConnector(source.connector);
      if (!connector) {
        fetchErrors.push(`Connector "${source.connector}" not found. Is it registered in src/connectors/?`);
        continue;
      }
      try {
        const data = await connector.fetch(source, since);
        if (data.items.length === 0) {
          sourceBlocks.push(`## ${data.source}\n(No new activity since last digest)`);
        } else {
          const lines = data.items
            .map((item) => {
              const who = item.author ? `**${item.author}**: ` : "";
              const link = item.url ? ` [(source)](${item.url})` : "";
              return `- ${who}${item.content}${link}`;
            })
            .join("\n");
          sourceBlocks.push(`## ${data.source}\n${lines}`);
        }
      } catch (err: any) {
        const msg = err?.message ?? String(err);
        fetchErrors.push(`Failed to fetch from ${source.connector}: ${msg}`);
        console.error(`[digest] fetch error from ${source.connector}:`, err);
      }
    }

    if (sourceBlocks.length === 0) {
      const detail = fetchErrors.length ? `\n\nErrors:\n${fetchErrors.join("\n")}` : "";
      throw new Error(`No data sources produced output.${detail}`);
    }

    if (fetchErrors.length) {
      console.warn("[digest] Some sources had errors:", fetchErrors);
    }
  }

  onEvent?.({ type: "phase", message: "Generating digest with Claude…" });

  const prompt = buildPrompt(entry, sourceBlocks.join("\n\n"), entry.prompt);
  const digestContent = await runWithCLI(prompt);

  onEvent?.({ type: "phase", message: "Saving…" });

  const dir = digestsDir();
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
  const filename = `${formatTimestamp(new Date())}.md`;
  const filepath = join(dir, filename);
  const fileContent = matter.stringify(digestContent, {
    scheduleId: entry.id,
    scheduleName: entry.name,
    trigger,
  });
  await writeFile(filepath, fileContent, "utf-8");

  const title = `Daily Digest — ${entry.name}`;
  const firstLines = digestContent.split("\n").slice(0, 5).join("\n");
  sendNotifications(title, firstLines).catch((err) => console.error("[digest] notification error:", err));

  return filepath;
}

async function getLastDigestTime(): Promise<Date> {
  const dir = digestsDir();
  if (!existsSync(dir)) return new Date(Date.now() - 24 * 60 * 60 * 1000);

  const files = await readdir(dir);
  const md = files.filter((f) => f.endsWith(".md")).sort();
  if (md.length === 0) return new Date(Date.now() - 24 * 60 * 60 * 1000);

  const last = md[md.length - 1]!;
  const parts = last.replace(".md", "").split("-").map(Number);
  const [year, month, day, hour, min] = parts as [number, number, number, number, number];
  const d = new Date(year, month - 1, day, hour, min);
  return isNaN(d.getTime()) ? new Date(Date.now() - 24 * 60 * 60 * 1000) : d;
}

export type DigestMeta = {
  filename: string;
  date: string;
  path: string;
  scheduleName?: string;
  trigger?: DigestTrigger;
};

export async function listDigests(): Promise<DigestMeta[]> {
  const dir = digestsDir();
  if (!existsSync(dir)) return [];
  const files = await readdir(dir);
  const mdFiles = files.filter((f) => f.endsWith(".md")).sort().reverse();
  return Promise.all(
    mdFiles.map(async (f) => {
      const filePath = join(dir, f);
      const raw = await readFile(filePath, "utf-8");
      const { data } = matter(raw);
      return {
        filename: f,
        date: f.replace(".md", "").replace(/-(\d{2})-(\d{2})$/, " $1:$2"),
        path: filePath,
        scheduleName: data.scheduleName as string | undefined,
        trigger: data.trigger as DigestTrigger | undefined,
      };
    }),
  );
}

export async function readDigest(filename: string): Promise<string> {
  const path = join(digestsDir(), filename);
  const raw = await readFile(path, "utf-8");
  return matter(raw).content.trimStart();
}
