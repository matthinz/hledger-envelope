import path from "node:path";
import {
  type Account,
  type Budget,
  type ImportSource,
  type IncludeRule,
  type Rule,
} from "../../schemas.ts";
import { isIncludeRule, recursivelyResolveIncludeRules } from "./include.ts";
import { isSetRule, buildSetRule } from "./set.ts";
import { isTransferRule, buildTransferRule } from "./transfer.ts";

const RULE_BUILDERS = {
  set: {
    identify: isSetRule,
    build: buildSetRule,
  },
  transfer: {
    identify: isTransferRule,
    build: buildTransferRule,
  },
} as const;

export function buildHeader(
  budget: Budget & { filename?: string },
  account: Account,
  source: ImportSource,
): string {
  const title = `Import rules for ${account.nickname ?? account.name} - ${source.name}`;

  return [
    title,
    "-".repeat(title.length),
    `This file was autogenerated--don't modify it, or you might lose your changes.`,
    budget.filename && `Instead, modify: ${path.resolve(budget.filename)}`,
    `(Generated at ${new Date().toISOString()})`,
  ]
    .filter((line) => line != null)
    .map((comment) => `# ${comment}`)
    .join("\n");
}

export function buildProperties(source: ImportSource): string {
  const properties = {
    "date-format": source.date_format,
    timezone: source.timezone,
    skip: source.headers ? 1 : 0,
    fields: source.columns.join(", "),
    comment: "%description",
  };

  return Object.entries(properties)
    .map(([key, value]) => `${key} ${value}`)
    .join("\n");
}

export async function buildIfStatements(
  rules: Rule[],
  budget: Budget & { filename?: string },
  account: Account,
): Promise<string> {
  let nonIncludeRules: Exclude<Rule, IncludeRule>[];

  if (budget.filename != null) {
    nonIncludeRules = await recursivelyResolveIncludeRules(
      path.dirname(budget.filename),
      rules,
    );
  } else {
    nonIncludeRules = rules.map((rule) => {
      if (isIncludeRule(rule)) {
        throw new Error("Can't handle include rule without a budget filename");
      }
      return rule;
    });
  }

  return nonIncludeRules
    .map((rule) => buildRule(rule, budget, account))
    .join("\n\n");
}

function buildRule(
  rule: Exclude<Rule, IncludeRule>,
  budget: Budget,
  account: Account,
): string {
  for (const { identify, build } of Object.values(RULE_BUILDERS)) {
    if (identify(rule)) {
      // TODO: Fix this so it is valid ts
      // @ts-expect-error
      return build(rule, budget, account);
    }
  }

  throw new Error("Unknown rule type");
}
