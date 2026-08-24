<!-- comins-reference:managed-start contract=v1.7 -->
# Comins Module AGENTS.md

## Common Policy

- Before changing this repository, read the canonical
  [Comins Contract v1.7](https://github.com/kim1124/comins-governance/blob/main/COMINS_CONTRACT.md)
  once per run. For inspection-only work, load it only when a Contract stage
  is relevant. Stop if it is unavailable or its heading does not match this
  block's version. Governance is the only common-policy owner.
- Load the Contract's license, sensitive-data, or release policy only when its
  corresponding stage is triggered.
- Keep module API, implementation, performance, browser, and checker commands
  in `Module Guidance`; the module owns their CI implementation.
<!-- comins-reference:managed-end -->

## Module Guidance

- The approved v1 scope provides sortable interactions for Vanilla JavaScript,
  React, Vue, and Svelte over one Vanilla TypeScript Core.
- The approved private development boundary has zero runtime dependencies;
  optional React, React DOM, Vue, and Svelte peers; and exact ESM exports `.`,
  `./core`, `./react`, `./vue`, `./svelte`, and `./styles.css`. Publishing,
  release versions, tags, and Releases remain separately maintainer-gated.
- The implemented private package boundary must validate with `npm run verify`.
  Browser and artifact gates apply only when their corresponding implementation
  tasks add them; do not invent publish gates.
