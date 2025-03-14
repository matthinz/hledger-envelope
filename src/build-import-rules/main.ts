import fs from "node:fs/promises";
import path from "node:path";
import { loadBudget, getImportRulesFilename } from "../budget.ts";
import type { Budget, Account, ImportSource } from "../schemas.ts";
import {
  buildIfStatements,
  buildHeader,
  buildProperties,
} from "./rules/build-import-rules.ts";

export async function run(args: string[]) {
  const budget = await loadBudget("budget.yaml");

  await budget.accounts.reduce<Promise<void>>(
    (promise, account) =>
      account.sources.reduce<Promise<void>>(
        (promise, source) =>
          promise.then(async () => {
            const filename = getImportRulesFilename(account, source);
            const content = await buildFileContent(budget, account, source);

            await fs.mkdir(path.dirname(filename), { recursive: true });
            await fs.writeFile(filename, content);
          }),
        promise,
      ),
    Promise.resolve(),
  );
}

export async function buildFileContent(
  budget: Budget & { filename?: string },
  account: Account,
  source: ImportSource,
): Promise<string> {
  return [
    buildHeader(budget, account, source),
    "",
    buildProperties(source),
    "",
    "# Import Rules",
    "# ------------",
    "",
    await buildIfStatements(source.rules, budget, account),
  ].join("\n");
}
