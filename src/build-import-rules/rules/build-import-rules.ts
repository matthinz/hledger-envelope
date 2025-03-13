import path from "node:path";
import {
  type Account,
  type Budget,
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

export async function buildImportRules(
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
