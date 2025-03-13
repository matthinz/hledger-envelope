import fs from "node:fs/promises";
import path from "node:path";
import { parse as parseYAML } from "yaml";
import {
  type IncludeRule,
  type Rule,
  INCLUDE_FILE_RULES_SCHEMA,
} from "../../schemas.ts";

export function isIncludeRule(rule: Rule): rule is IncludeRule {
  return "include" in rule;
}

export function buildIncludeRule(rule: IncludeRule): string {
  return `include ${rule.include}`;
}

export async function recursivelyResolveIncludeRules(
  cwd: string,
  rules: Rule[],
  nonIncludeRules: Exclude<Rule, IncludeRule>[] = [],
  filesSeen: Set<string> = new Set(),
): Promise<Exclude<Rule, IncludeRule>[]> {
  for (const rule of rules) {
    if (isIncludeRule(rule)) {
      const filename = path.resolve(cwd, rule.include);
      if (filesSeen.has(filename)) {
        continue;
      }

      filesSeen.add(filename);
      const text = await fs.readFile(filename, "utf8");
      const yaml = parseYAML(text);
      const { rules: includedRules } = INCLUDE_FILE_RULES_SCHEMA.parse(yaml);

      await recursivelyResolveIncludeRules(
        path.dirname(filename),
        includedRules,
        nonIncludeRules,
        filesSeen,
      );
    } else {
      nonIncludeRules.push(rule);
    }
  }

  return nonIncludeRules;
}
