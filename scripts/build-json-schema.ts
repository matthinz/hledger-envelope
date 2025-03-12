import { zodToJsonSchema } from "zod-to-json-schema";
import { BUDGET_SCHEMA } from "../src/schemas.ts";

console.log(JSON.stringify(zodToJsonSchema(BUDGET_SCHEMA), null, 2));
