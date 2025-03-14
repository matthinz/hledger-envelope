import type { SetRule } from "../../schemas.ts";

type RuleWithCriteria = Pick<SetRule, "direction" | "match">;

export function buildCriteria({
  direction,
  match,
}: RuleWithCriteria): string[] {
  const matchBlock = typeof match === "string" ? { description: match } : match;

  const amountField = direction === "in" ? "amount1-in" : "amount1-out";

  return Object.entries(matchBlock).map(([field, value], index) => {
    value = Array.isArray(value) ? value : [value];

    const expressions = value.map((v) => {
      if (typeof v === "number") {
        return numberToRegex(v);
      }

      return String(v);
    });

    if (field === "amount") {
      field = amountField;
    }

    const result = `%${field} ${expressions.length === 1 ? expressions[0] : `(${expressions.join("|")})`}`;
    return index > 0 ? `&${result}` : result;
  });
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
