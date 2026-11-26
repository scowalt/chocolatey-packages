import { readFileSync } from "node:fs";
import { errorMessage } from "./runner.ts";

export interface PrepareEntry {
  readonly id: string;
  readonly hash: string;
  readonly installed: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseEntry(value: unknown): PrepareEntry {
  if (!isRecord(value)) throw new Error("Report entry is not an object");
  const { id, hash, installed } = value;
  if (typeof id !== "string") throw new Error('Report field "id" is not a string');
  if (typeof hash !== "string") throw new Error('Report field "hash" is not a string');
  if (typeof installed !== "boolean") throw new Error('Report field "installed" is not a boolean');
  return { id, hash, installed };
}

export function parseReport(text: string): PrepareEntry[] {
  const value: unknown = JSON.parse(text);
  if (!Array.isArray(value)) throw new Error("Report must be a list of packages");
  return value.map(parseEntry);
}

export function serializeReport(entries: readonly PrepareEntry[]): string {
  return `${JSON.stringify(entries, null, 2)}\n`;
}

export function loadReport(path: string): PrepareEntry[] {
  try {
    return parseReport(readFileSync(path, "utf8"));
  } catch (error) {
    console.error(`prepare report unreadable: ${errorMessage(error)}`);
    return [];
  }
}
