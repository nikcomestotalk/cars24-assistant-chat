import fs from "fs";
import path from "path";
import type { ConversationFlow } from "./flowTypes";
import { SEED_FLOWS } from "./flowTypes";

const FLOWS_FILE = path.join(process.cwd(), "data", "flows.json");

export function readFlowsFromDisk(): ConversationFlow[] {
  try {
    if (fs.existsSync(FLOWS_FILE)) {
      const raw = fs.readFileSync(FLOWS_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return SEED_FLOWS;
}

export function writeFlowsToDisk(flows: ConversationFlow[]): void {
  try {
    const dir = path.dirname(FLOWS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(FLOWS_FILE, JSON.stringify(flows, null, 2));
  } catch (err) {
    console.error("Failed to write flows:", err);
  }
}
