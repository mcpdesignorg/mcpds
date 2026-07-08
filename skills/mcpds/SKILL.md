---
name: mcpds
description: "Use when: consulting, validating, designing, generating code, writing docs, or answering questions about MCPDS, MCP Design Specification, mcp.yaml, *.mcp.yaml, MCP server design-time specs, schema fields, validation rules, server.json projection, tools, resources, prompts, transports, auth, packaging, and MCPDS compliance."
argument-hint: "MCPDS question, document, code, or documentation task"
---

# MCPDS

Use this skill for general-purpose MCPDS work: answering specification questions, reviewing or generating `mcp.yaml` / `*.mcp.yaml` documents, producing code or documentation from MCPDS, explaining validation failures, and checking whether proposed fields or behavior belong in MCPDS.

## References

Load only the files needed for the task:

- [Human-readable MCPDS specification](./references/mcpds-1.0.0.md) for concepts, rules, examples, and normative guidance.
- [TypeScript schema source](./references/mcpds-schema.ts) for the canonical source shape used by tooling.
- [Generated JSON Schema](./references/mcpds-1.0.schema.json) for machine validation and structural constraints.
- [Complete example MCPDS document](./references/example.mcp.yaml) for realistic YAML structure and authoring patterns.

## Procedure

1. Identify whether the task is consultation, validation, authoring, code generation, documentation generation, or compatibility review.
2. Load the human-readable specification for conceptual or normative questions.
3. Load the TypeScript schema source when discussing the canonical schema implementation or generating TypeScript-aware tooling.
4. Load the JSON Schema when validating document structure, schema fields, required properties, enums, or generated validator behavior.
5. Load the example YAML when producing or explaining concrete MCPDS documents.
6. Treat MCPDS as the source of truth for local UI and generation work. Do not invent new MCPDS fields or behavior unless the user explicitly asks for a specification extension.
7. Distinguish structural validation from semantic validation. Structural rules are in the JSON Schema; semantic rules such as reverse-DNS naming, cross-collection uniqueness, `$ref` resolution, and embedded JSON Schema validity require tooling on top.
8. When modifying the actual MCPDS specification in the repository, keep the canonical TypeScript schema, human-readable specification, and generated JSON Schema consistent. If an inconsistency is found, report it and ask before proceeding.
9. When generating documentation or code, preserve `x-*` extension fields and `meta` / `_meta` semantics unless the target artifact intentionally drops unsupported layers.
10. When projecting to registry `server.json`, remember that the capability layer (`tools`, `resources`, `resourceTemplates`, `prompts`) is omitted and remote entries are derived from HTTP/SSE transports.

## Completion Checks

- The answer or generated artifact uses MCPDS 1.0 terminology accurately.
- Required top-level fields are present for documents: `mcpds`, `server`, and `transports`.
- Tool definitions include `name` and `inputSchema`; descriptions are recommended even where not structurally required.
- Transport, auth, packaging, and projection behavior match the specification rather than assumptions from unrelated formats.
- Any schema or documentation changes call out consistency requirements across the canonical TS source, MD specification, and generated JSON Schema.
