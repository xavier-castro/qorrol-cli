import fs from "fs-extra";
import path from "path";
import type { TriageLabelMap, TriageRole } from "./types.js";

const TRIAGE_ROLES: TriageRole[] = [
  "needs-triage",
  "needs-info",
  "ready-for-agent",
  "ready-for-human",
  "wontfix",
];

export const DEFAULT_TRIAGE_LABEL_MAP: TriageLabelMap = {
  "needs-triage": "needs-triage",
  "needs-info": "needs-info",
  "ready-for-agent": "ready-for-agent",
  "ready-for-human": "ready-for-human",
  wontfix: "wontfix",
};

/**
 * Parses docs/agents/triage-labels.md table (right-hand "our tracker" column).
 * Falls back to {@link DEFAULT_TRIAGE_LABEL_MAP} when the file is missing or incomplete.
 */
export async function loadTriageLabelMap(
  cwd: string = process.cwd(),
): Promise<TriageLabelMap> {
  const filePath = path.join(cwd, "docs/agents/triage-labels.md");
  if (!(await fs.pathExists(filePath))) {
    return { ...DEFAULT_TRIAGE_LABEL_MAP };
  }

  const text = await fs.readFile(filePath, "utf8");
  const map: Partial<TriageLabelMap> = {};

  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|") || trimmed.includes("---")) continue;
    const cells = trimmed
      .split("|")
      .map((c) => c.trim())
      .filter(Boolean);
    if (cells.length < 2) continue;

    const canonical = cells[0].replace(/`/g, "") as TriageRole;
    const tracker = cells[1].replace(/`/g, "");
    if (!TRIAGE_ROLES.includes(canonical)) continue;
    map[canonical] = tracker;
  }

  return { ...DEFAULT_TRIAGE_LABEL_MAP, ...map };
}