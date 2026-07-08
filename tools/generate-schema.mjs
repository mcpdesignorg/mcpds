// Generates the canonical MCPDS JSON Schema from a single source of truth:
// src/schema/mcpds-schema.ts (export `mcpdsSchema`).
//
// The TypeScript schema is the source of truth. This script produces
// schemas/mcpds-1.0.schema.json from it, so the two artifacts never drift apart.
//
// Run: `npm run gen:schema` (from the repository root).
// Requires the built package (dist).

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { mcpdsSchema } from "../dist/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(here, "..", "schemas", "mcpds-1.0.schema.json");

const json = `${JSON.stringify(mcpdsSchema, null, 2)}\n`;
writeFileSync(outputPath, json, "utf8");

console.log(`Wrote ${outputPath}`);
