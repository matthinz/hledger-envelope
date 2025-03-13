import { z } from "zod";

export type Account = z.infer<typeof ACCOUNT_SCHEMA>;
export type Budget = z.infer<typeof BUDGET_SCHEMA>;
export type ImportSource = z.infer<typeof SOURCE_SCHEMA>;

export type IncludeRule = z.infer<typeof INCLUDE_RULE_SCHEMA>;
export type SetRule = z.infer<typeof SET_RULE_SCHEMA>;
export type TransferRule = z.infer<typeof TRANSFER_RULE_SCHEMA>;

export type Rule = z.infer<typeof RULE_SCHEMA>;

export const HLEDGER_FIELD = z.enum([
  "date",
  "date2",
  "status",
  "code",
  "description",
  "comment",
  "comment1",
  "comment2",
  "comment3",
  "comment4",
  "comment5",
  "comment6",
  "comment7",
  "comment8",
  "comment9",
  "account1",
  "account2",
  "account3",
  "account4",
  "account5",
  "account6",
  "account7",
  "account8",
  "account9",
  "amount1",
  "amount2",
  "amount3",
  "amount4",
  "amount5",
  "amount6",
  "amount7",
  "amount8",
  "amount9",
  "amount1-in",
  "amount2-in",
  "amount3-in",
  "amount4-in",
  "amount5-in",
  "amount6-in",
  "amount7-in",
  "amount8-in",
  "amount9-in",
  "amount1-out",
  "amount2-out",
  "amount3-out",
  "amount4-out",
  "amount5-out",
  "amount6-out",
  "amount7-out",
  "amount8-out",
  "amount9-out",
]);

export const ACCOUNT_TYPES_SCHEMA = z.enum(["checking", "savings", "credit"]);

const MATCH_KEY_SCHEMA = HLEDGER_FIELD.or(z.string());

const MATCH_VALUE_SCHEMA = z
  .string()
  .or(z.number())
  .or(z.array(z.string().or(z.number())));

const MATCH_SET_SCHEMA = z.record(
  z.union([HLEDGER_FIELD, z.enum(["envelope"])]),
  z.string(),
);

const MATCH_SCHEMA = z
  .record(MATCH_KEY_SCHEMA, MATCH_VALUE_SCHEMA)
  .or(z.string());

export const SET_RULE_SCHEMA = z.object({
  name: z.string().optional(),
  direction: z.enum(["in", "out"]).default("out"),
  match: MATCH_SCHEMA,
  set: MATCH_SET_SCHEMA,
});

export const INCLUDE_RULE_SCHEMA = z.object({
  include: z.string(),
});

export const TRANSFER_RULE_SCHEMA = z.object({
  match: MATCH_SCHEMA,
  transfer: z.boolean(),
});

export const RULE_SCHEMA = z.union([
  INCLUDE_RULE_SCHEMA,
  SET_RULE_SCHEMA,
  TRANSFER_RULE_SCHEMA,
]);

export const RULES_SCHEMA = z.array(RULE_SCHEMA);

export const INCLUDE_FILE_RULES_SCHEMA = z.object({
  rules: RULES_SCHEMA,
});

export const SOURCE_SCHEMA = z.object({
  name: z.string(),
  enabled: z.boolean().default(true),
  filename: z.string(),
  date_format: z.string().default("%Y-%m-%d"),
  timezone: z.string(),
  headers: z.boolean().default(true),
  columns: z.array(HLEDGER_FIELD.or(z.string())),
  rules: RULES_SCHEMA,
});

export const ACCOUNT_SCHEMA = z.object({
  name: z.string(),
  nickname: z.string().optional(),
  type: ACCOUNT_TYPES_SCHEMA,
  sources: z.array(SOURCE_SCHEMA),
});

export const BUDGET_SCHEMA = z.object({
  container_account: z.string(),
  categories: z.array(z.string()),
  accounts: z.array(ACCOUNT_SCHEMA),
});
