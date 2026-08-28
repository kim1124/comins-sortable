# Security Policy

## Reporting a Vulnerability

Report potential vulnerabilities privately through this repository's GitHub Security Advisories page using Private Vulnerability Reporting. Do not open a public issue, pull request, or discussion for an unpatched vulnerability.

## Scope

The latest published `0.x` version receives security fixes. Older pre-1.0
versions are unsupported after a newer version is published.

## Release Controls

Keep Private Vulnerability Reporting active and enable GitHub's available dependency and secret-scanning alerts. Version `0.1.0` is bootstrapped interactively with maintainer 2FA and no automation token because trusted and staged publishing require an existing package.

After bootstrap, register the exact repository, publish workflow filename, and `npm` environment as the trusted publisher. Allow only `npm stage publish`, disallow token publishing, and require maintainer 2FA approval for every staged version.

For every release, create one artifact with `npm pack --json --ignore-scripts`, validate its exact file list, scan the extracted contents, and publish or stage that same verified artifact.

## Disclosure

The maintainer will assess the report, prepare a remediation when applicable, and decide whether to publish a GitHub security advisory or request a CVE after the remediation is available.

## Credential and PII Incidents

Treat a credential/PII incident as a release blocker. Stop the affected release, rotate any exposed credential, preserve non-public evidence, and coordinate remediation without public disclosure of the sensitive value.
