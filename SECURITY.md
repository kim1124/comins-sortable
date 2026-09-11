# Security Policy

## Reporting a Vulnerability

Report potential vulnerabilities privately through this repository's GitHub Security Advisories page using Private Vulnerability Reporting. Do not open a public issue, pull request, or discussion for an unpatched vulnerability.

## Scope

The latest published `0.x` version receives security fixes. Older pre-1.0
versions are unsupported after a newer version is published.

## Release Controls

Keep Private Vulnerability Reporting active and enable GitHub's available dependency and secret-scanning alerts. Version `0.1.0` was withdrawn after a public identity metadata incident and must not be reused.

Before a replacement bootstrap, configure a delivery-capable Comins service
email on the npm account and verify the authenticated profile with
`npm run check:npm-profile`. The approved public name and email must come from
the provider-managed `COMINS_NPM_PUBLIC_NAME` and `COMINS_NPM_PUBLIC_EMAIL`
values; do not store their values in the repository or logs. Bootstrap remains
blocked until `node scripts/check-public-identities.mjs --all-history` also
passes. It remains interactive with maintainer 2FA and no automation token
because trusted and staged publishing require an existing package.

Immediately after an interactive bootstrap, run
`npm run check:npm-bootstrap -- <exact-version>` to verify that version's
maintainer, direct publisher, author, and contributor metadata. Then register
the exact repository, publish workflow filename, and `npm` environment as the
trusted publisher. Allow only `npm stage publish`, disallow token publishing,
and require maintainer 2FA approval for every staged version. Before staging,
verify the current registry maintainer name and email; after a trusted
publication, run `npm run check:npm-identity -- --version <exact-version>` to
verify that version's maintainer, trusted publisher, approver, author, and
contributor metadata.

For every release, create one artifact with `npm pack --json --ignore-scripts`, validate its exact file list, scan the extracted contents, and publish or stage that same verified artifact.

## Disclosure

The maintainer will assess the report, prepare a remediation when applicable, and decide whether to publish a GitHub security advisory or request a CVE after the remediation is available.

## Credential and PII Incidents

Treat a credential/PII incident as a release blocker. Stop the affected release, rotate any exposed credential, preserve non-public evidence, and coordinate remediation without public disclosure of the sensitive value.
