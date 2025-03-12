import fs from "node:fs/promises";
import path from "node:path";
import { getImportRulesFilename, loadBudget } from "./budget.ts";
import type { Account, Budget, ImportSource, Rule } from "./schemas.ts";

run(process.argv.slice(2)).catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

async function run(args: string[]) {
  const budget = await loadBudget("budget.yaml");

  await budget.accounts.reduce<Promise<void>>((promise, account) => {
    account.sources.forEach((source) => {
      promise = promise.then(() => buildImportRules(budget, account, source));
    });

    return promise;
  }, Promise.resolve());
}

async function buildImportRules(
  budget: Budget,
  account: Account,
  source: ImportSource
): Promise<void> {
  const filename = getImportRulesFilename(account, source);
  const content = [
    `# Import rules for ${source.name}`,
    `# Generated on ${new Date().toISOString()}`,
    "",
    source.headers && "skip 1",
    `fields ${source.columns.join(", ")}`,
    `date-format ${source.date_format}`,
    `timezone ${source.timezone}`,
    "comment %description",
    "",
    source.rules
      .map((rule) => buildRule(budget, account, source, rule))
      .join("\n\n"),
  ].join("\n");

  await fs.mkdir(path.dirname(filename), { recursive: true });
  await fs.writeFile(filename, content);
}

function buildRule(
  budget: Budget,
  account: Account,
  source: ImportSource,
  rule: Rule
): string {
  if ("include" in rule) {
    throw new Error("NOT IMPLEMENTED: include rules");
  }

  const criteria = Object.entries(rule.match)
    .map(([field, value]) => {
      value = Array.isArray(value) ? value : [value];

      const expressions = value.map((v) => {
        if (typeof v === "number") {
          return numberToRegex(v);
        }

        return String(v);
      });

      return `%${field} ${expressions.length === 1 ? expressions[0] : `(${expressions.join("|")})`}`;
    })
    .map((c, index) => (index > 0 ? `&${c}` : c));

  const ifStatement = `if\n${criteria.join("\n")}`;

  const setStatements: string[] = [];

  Object.entries(rule.set).forEach(([field, value]) => {
    const statements =
      field === "envelope"
        ? buildEnvelopeSetStatements(budget, account, value)
        : [`${field} ${value}`];

    statements.forEach((s) => setStatements.push(`  ${s}`));
  });

  return [
    rule.name && `# ${source.name} - ${rule.name}`,
    ifStatement,
    setStatements.join("\n"),
  ]
    .filter(Boolean)
    .join("\n");
}

function numberToRegex(value: number): string {
  const sign = value < 0 ? "-" : "";
  let [whole, decimal] = Math.abs(value).toFixed(2).split(".");

  whole = whole
    .split("")
    .reverse()
    .map((c, index) => {
      if ((index + 1) % 3 === 0) {
        return `,?${c}`;
      }
      return c;
    })
    .reverse()
    .join("");

  const prefix = `${sign}\\$?`;

  const patterns = [`${prefix}${whole}\\.${decimal}$`];

  if (decimal === "00") {
    patterns.push(`${prefix}${whole}$`);
  }

  return patterns.length === 1 ? patterns[0] : `(${patterns.join("|")})`;
}
function buildEnvelopeSetStatements(
  budget: Budget,
  account: Account,
  targetCategory: string
): string[] {
  if (!budget.categories.includes(targetCategory)) {
    throw new Error(`Unknown category: ${targetCategory}`);
  }

  const envelopeAccount = `${account.name}:Budget:${targetCategory}`;

  if (account.type === "credit") {
    /*
      Credit transactions are 4-step:
      1. Debit the credit card account (account1)
      2. Credit the expense account (account2)
      3. Debit the envelope account (account3)
      2. Credit the CC payment account (account4)
    */

    const ccAccount = account.name;
    const expenseAccount = targetCategory;
    const envelopeAccount = `${budget.container_account}:Budget:${targetCategory}`;
    const ccPaymentAccount = `${budget.container_account}:Budget:Payments:${account.name}`;

    return [
      [ccAccount, "-%amount1-out"],
      [expenseAccount, "%amount1-out"],
      [envelopeAccount, "-%amount1-out"],
      [ccPaymentAccount, "%amount1-out"],
    ].reduce<string[]>((result, [account, amount], index) => {
      result.push(
        `account${index + 1} ${account}`,
        `amount${index + 1} ${amount}`
      );
      return result;
    }, []);
  }

  // TODO: Handle transfers between physical accounts

  // Otherwise it's easier, just pull money from envelope
  return [`account1 ${envelopeAccount}`, `account2 ${targetCategory}`];
}
