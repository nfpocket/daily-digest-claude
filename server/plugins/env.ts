import { readFileSync, existsSync } from "node:fs";
import { envPath } from "../utils/config";
import { defineNitroPlugin } from "nitropack/runtime";

export default defineNitroPlugin(() => {
  const path = envPath();
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf-8").split("\n")) {
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();
    if (key && !(key in process.env)) process.env[key] = value;
  }
});
