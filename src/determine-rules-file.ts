import path from "node:path";
import { getImportRulesFilename, loadBudget } from "./budget.ts";

run(process.argv.slice(2)).catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

async function run(args: string[]) {
  if (args.length !== 1) {
    throw new Error("Usage: determine-rules-file <csv-file>");
  }
  const [csvFile] = args;
  const budget = await loadBudget("budget.yaml");
  const name = path.basename(csvFile);
  for (const account of budget.accounts) {
    for (const source of account.sources) {
      const regex = new RegExp(source.filename);
      if (regex.test(name)) {
        console.log(getImportRulesFilename(account, source));
        return;
      }
    }
  }
  console.error(`No source found for ${name}`);
  process.exitCode = 1;
}
