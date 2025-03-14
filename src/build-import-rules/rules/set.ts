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

  let envelope: string | undefined;
  let others: Record<string, string | number | (string | number)[]> = {};

  Object.entries(rule.set).forEach(([field, value]) => {
    if (field === "envelope") {
      if (envelope != null) {
        throw new Error("Can't set envelope twice");
      }

      if (typeof value !== "string") {
        throw new Error("envelope must be a string");
      }

      envelope = value;
      return;
    }

    others[field] = value;
  });

  if (envelope != null && Object.keys(others).length > 0) {
    throw new Error("Can't set envelope and other fields at the same time");
  }

  if (envelope != null) {
    setStatements.push(
      ...buildEnvelopeSetStatements(budget, account, envelope),
    );
  } else {
    others["account1"] = others["account1"] ?? account.name;
    Object.entries(others).forEach(([field, value]) => {
      setStatements.push(...buildSetStatements(field, value));
    });

    setStatements.sort(compareSetStatements);
  }

  const name = "name" in rule ? rule.name : undefined;

  return [
    name && `# ${name}`,
    ifStatement,
    setStatements.map((s) => `  ${s}`).join("\n"),
  ]
    .filter(Boolean)
    .join("\n");
}

function buildSetStatements(
  field: string,
  value: string | number | (string | number)[],
): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => `${field} ${v}`);
  } else {
    return [`${field} ${value}`];
  }
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

function compareSetStatements(a: string, b: string): number {
  const aMatch = /(.+)(\d+)$/.exec(a);
  const bMatch = /(.+)(\d+)$/.exec(b);

  if (aMatch == null && bMatch == null) {
    if (a < b) {
      return -1;
    } else if (a > b) {
      return 1;
    } else {
      return 0;
    }
  } else if (aMatch == null) {
    return -1;
  } else if (bMatch == null) {
    return 1;
  }

  const aIndex = parseInt(aMatch[2], 10);
  const bIndex = parseInt(bMatch[2], 10);

  if (aIndex !== bIndex) {
    return aIndex - bIndex;
  }

  return aMatch[1].localeCompare(bMatch[1]);
}
