import fs from "node:fs/promises";
import { loadBudget } from "./budget.js";
import type { Budget } from "./schemas.ts";

const ACCOUNTS_JOURNAL = "journals/accounts.journal";

run(process.argv.slice(2)).catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

async function run(args: string[]) {
  const budget = await loadBudget("budget.yaml");
  await fs.writeFile(ACCOUNTS_JOURNAL, buildAccountsJournal(budget));
}

function buildAccountsJournal(budget: Budget) {
  const physicalAccounts = budget.accounts.map((a) => a.name);
  const envelopeAccounts = [
    "Unassigned",
    // Buckets for credit card payments
    ...budget.accounts.filter((a) => a.type == "credit").map((a) => a.name),
    // Buckets for each category
    ...budget.categories,
  ].map((name) => `${budget.container_account}:Budget:${name}`);
  return [
    `; Accounts journal`,
    `; Generated on ${new Date().toISOString()}`,
    "",
    "; Physical accounts",
    ...physicalAccounts.map((a) => `account ${a}`),
    "",
    "",
    "; Categories",
    ...budget.categories.map((a) => `account ${a}`),
    "",
    "",
    "; Envelopes",
    ...envelopeAccounts.map((a) => `account ${a}`),
    "",
  ].join("\n");
}
