import {
  type Budget,
  type Account,
  type Rule,
  type SetRule,
} from "../../schemas.ts";
import { buildCriteria } from "./criteria.ts";

export function isSetRule(rule: Rule): rule is SetRule {
  return "set" in rule;
}

export function buildSetRule(
  rule: SetRule,
  budget: Budget,
  account: Account,
): string {
  const criteria = buildCriteria(rule);

  const ifStatement = `if\n${criteria.join("\n")}`;

  const setStatements: string[] = [];

  Object.entries(rule.set).forEach(([field, value]) => {
    if (field === "envelope") {
      setStatements.push(
        ...buildEnvelopeSetStatements(budget, account, value).map(
          (s) => `  ${s}`,
        ),
      );
      return;
    }

    setStatements.push(`  ${field} ${value}`);
  });

  const name = "name" in rule ? rule.name : undefined;

  return [name && `# ${name}`, ifStatement, setStatements.join("\n")]
    .filter(Boolean)
    .join("\n");
}

function buildEnvelopeSetStatements(
  budget: Budget,
  account: Account,
  targetCategory: string,
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
        `amount${index + 1} ${amount}`,
      );
      return result;
    }, []);
  }

  // TODO: Handle transfers between physical accounts

  // Otherwise it's easier, just pull money from envelope
  return [`account1 ${envelopeAccount}`, `account2 ${targetCategory}`];
}
