import { describe, it } from "node:test";
import assert from "node:assert";
import { buildIfStatements } from "./build-import-rules.ts";
import {
  type Budget,
  type Account,
  SET_RULE_SCHEMA,
  RULE_SCHEMA,
} from "../../schemas.ts";

describe("#buildIfStatements", () => {
  const budget = {
    container_account: "Checking",
    categories: ["Expenses:Groceries"],
    accounts: [
      {
        name: "Checking",
      },
      {
        name: "Savings",
      },
    ],
  } as unknown as Budget;
  const account = {} as unknown as Account;

  describe("SetRule", () => {
    describe("setting account2", () => {
      const rules = [
        SET_RULE_SCHEMA.parse({
          match: {
            description: "foo",
          },
          set: {
            account2: "Bar",
          },
        }),
      ];

      const expected = ["if", "%description foo", "  account2 Bar"].join("\n");

      it("generates the correct result", async () => {
        assert.equal(await buildIfStatements(rules, budget, account), expected);
      });
    });

    describe("setting envelope", () => {
      describe("on container account", () => {
        const rules = [
          SET_RULE_SCHEMA.parse({
            match: {
              description: "foo",
            },
            set: {
              envelope: "Expenses:Groceries",
            },
          }),
        ];

        const account = {
          name: "Checking",
        } as unknown as Account;

        const expected = [
          "if",
          "%description foo",
          "  account1 Checking:Budget:Expenses:Groceries",
          "  account2 Expenses:Groceries",
        ].join("\n");

        it("generates the correct result", async () => {
          assert.equal(
            await buildIfStatements(rules, budget, account),
            expected,
          );
        });
      });

      describe("on credit card account", () => {
        const rules = [
          SET_RULE_SCHEMA.parse({
            match: {
              description: "foo",
            },
            set: {
              envelope: "Expenses:Groceries",
            },
          }),
        ];

        const account = {
          name: "CreditCard",
          type: "credit",
        } as unknown as Account;

        it("generates the correct result", async () => {
          const expected = [
            "if",
            "%description foo",
            "  account1 CreditCard",
            "  amount1 -%amount1-out",
            "  account2 Expenses:Groceries",
            "  amount2 %amount1-out",
            "  account3 Checking:Budget:Expenses:Groceries",
            "  amount3 -%amount1-out",
            "  account4 Checking:Budget:Payments:CreditCard",
            "  amount4 %amount1-out",
          ].join("\n");

          const actual = await buildIfStatements(rules, budget, account);

          assert.equal(actual, expected);
        });
      });

      describe("on other account", () => {
        it.skip("TODO: Handle envelope transactions requiring transfers");
      });
    });
  });

  describe("TransferRule", () => {
    it("generates if statements replacing __SOURCE__ and __DESTINATION__", async () => {
      const rules = [
        RULE_SCHEMA.parse({
          match: {
            description: "Transfer from __SOURCE__ to __DESTINATION__",
          },
          transfer: true,
        }),
      ];

      const account = {
        name: "Checking",
      } as unknown as Account;

      const expected = [
        "if",
        "%description Transfer from Checking to Savings",
        "  account1 Checking",
        "  account2 Savings",
        "",
        "if",
        "%description Transfer from Savings to Checking",
        "  account1 Savings",
        "  account2 Checking",
      ].join("\n");

      assert.equal(await buildIfStatements(rules, budget, account), expected);
    });
  });
});
