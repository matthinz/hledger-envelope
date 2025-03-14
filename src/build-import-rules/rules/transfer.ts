import type {
  Account,
  Budget,
  Rule,
  SetRule,
  TransferRule,
} from "../../schemas.ts";
import { buildSetRule } from "./set.ts";

export function isTransferRule(rule: Rule): rule is TransferRule {
  return "transfer" in rule;
}

export function buildTransferRule(
  rule: TransferRule,
  budget: Budget,
  account: Account,
): string {
  return budget.accounts
    .reduce<string[]>((result, otherAccount) => {
      if (otherAccount.name === account.name) {
        return result;
      }

      const accountName = account.nickname ?? account.name;
      const otherAccountName = otherAccount.nickname ?? otherAccount.name;

      // Case 1: Money moving out of this account to another
      const importAccountAsSource = buildSetRule(
        {
          direction: "out",
          match: replaceTokensInMatch(rule.match, [
            [/__SOURCE__/, accountName],
            [/__DESTINATION__/, otherAccountName],
          ]),
          set: {
            account1: account.name,
            account2: otherAccount.name,
            description: `Transfer: ${accountName} -> ${otherAccountName}`,
          },
        },
        budget,
        account,
      );

      // Case 2: Moving money from another account to this
      const importAccountAsDestination = buildSetRule(
        {
          direction: "in",
          match: replaceTokensInMatch(rule.match, [
            [/__SOURCE__/, otherAccountName],
            [/__DESTINATION__/, accountName],
          ]),
          set: {
            account1: otherAccount.name,
            account2: account.name,
            description: `Transfer: ${otherAccountName} -> ${accountName}`,
          },
        },
        budget,
        account,
      );

      result.push(importAccountAsSource, importAccountAsDestination);

      return result;
    }, [])
    .join("\n\n");
}

function replaceTokensInMatch(
  match: TransferRule["match"],
  tokens: [RegExp, string][],
): TransferRule["match"] {
  const result: TransferRule["match"] = {};

  for (const [key, value] of Object.entries(match)) {
    const valueAsArray = (Array.isArray(value) ? value : [value]).map((v) => {
      if (typeof v === "number") {
        return v;
      }

      return tokens.reduce<string>(
        (result, [token, replacement]) => result.replace(token, replacement),
        v,
      );
    });

    result[key] = valueAsArray.length === 1 ? valueAsArray[0] : valueAsArray;
  }

  return result;
}
