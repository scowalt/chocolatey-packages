import { readFileSync } from "node:fs";
import type { Plan } from "./plan.ts";
import { errorMessage } from "./runner.ts";

export interface PrepareEntry {
  readonly id: string;
  readonly plan: Plan;
  readonly hash: string;
  readonly installed: boolean;
}

export interface PrepareReport {
  readonly packages: readonly PrepareEntry[];
  readonly failures: readonly string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringField(record: Record<string, unknown>, name: string): string {
  const value = record[name];
  if (typeof value !== "string") throw new Error(`Report field "${name}" is not a string`);
  return value;
}

function booleanField(record: Record<string, unknown>, name: string): boolean {
  const value = record[name];
  if (typeof value !== "boolean") throw new Error(`Report field "${name}" is not a boolean`);
  return value;
}

function parsePlan(value: unknown): Plan {
  if (!isRecord(value)) throw new Error("Report plan is not an object");
  switch (value.kind) {
    case "ahead":
      return { kind: "ahead", nuspec: stringField(value, "nuspec"), upstream: stringField(value, "upstream") };
    case "rejected":
    case "moderation":
    case "approved":
    case "publish":
      return { kind: value.kind, version: stringField(value, "version"), rewrite: booleanField(value, "rewrite") };
    default:
      throw new Error(`Report plan has an unknown kind: ${JSON.stringify(value.kind)}`);
  }
}

function parseEntry(value: unknown): PrepareEntry {
  if (!isRecord(value)) throw new Error("Report package is not an object");
  return {
    id: stringField(value, "id"),
    plan: parsePlan(value.plan),
    hash: stringField(value, "hash"),
    installed: booleanField(value, "installed"),
  };
}

export function parseReport(text: string): PrepareReport {
  const value: unknown = JSON.parse(text);
  if (!isRecord(value) || !Array.isArray(value.packages) || !Array.isArray(value.failures)) {
    throw new Error("Report must have a packages list and a failures list");
  }
  return {
    packages: value.packages.map(parseEntry),
    failures: value.failures.map((failure: unknown) => {
      if (typeof failure !== "string") throw new Error("Report failure is not a string");
      return failure;
    }),
  };
}

export function serializeReport(report: PrepareReport): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}

export function loadReport(path: string): PrepareReport {
  try {
    return parseReport(readFileSync(path, "utf8"));
  } catch (error) {
    return { packages: [], failures: [`prepare report unreadable: ${errorMessage(error)}`] };
  }
}
