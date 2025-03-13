import fs from "node:fs/promises";
import path from "node:path";
import { loadBudget, getImportRulesFilename } from "../budget.ts";
import { buildImportRules } from "./rules/build-import-rules.ts";

export async function run(args: string[]) {
  const budget = await loadBudget("budget.yaml");

  await budget.accounts.reduce<Promise<void>>(
    (promise, account) =>
      account.sources.reduce<Promise<void>>(
        (promise, source) =>
          promise.then(async () => {
            const filename = getImportRulesFilename(account, source);
            const content = await buildImportRules(
              source.rules,
              budget,
              account,
            );

            await fs.mkdir(path.dirname(filename), { recursive: true });
            await fs.writeFile(filename, content);
          }),
        promise,
      ),
    Promise.resolve(),
  );
}
