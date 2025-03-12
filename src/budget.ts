import fs from "node:fs/promises";
import path from "node:path";
import { parse as parseYAML } from "yaml";
import { BUDGET_SCHEMA, type Account, type ImportSource } from "./schemas.ts";

const UNASSIGNED_CATEGORY = "Unassigned";

export async function loadBudget(filename: string) {
  const text = await fs.readFile(filename, "utf8");
  const yaml = parseYAML(text);
  const budget = BUDGET_SCHEMA.parse(yaml);
  if (!budget.categories.includes(UNASSIGNED_CATEGORY)) {
    budget.categories.push(UNASSIGNED_CATEGORY);
  }
  return budget;
}

export function getImportRulesFilename(account: Account, source: ImportSource) {
  const name =
    [account.nickname ?? account.name, source.name].map(slug).join("-") +
    ".generated.rules";
  return path.join("rules", name);
}

function slug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-{2,}/g, "-");
}
