# Security Policy

## Reporting a Vulnerability

Report potential vulnerabilities privately through this repository's GitHub Security Advisories page using Private Vulnerability Reporting. Do not open a public issue, pull request, or discussion for an unpatched vulnerability.

## Scope

This project has not released a public npm package. Once releases begin, supported versions and the security-fix support window will be documented here.

## Before First Public Release

Keep Private Vulnerability Reporting active and enable GitHub's available dependency and secret-scanning alerts after the package scope is approved. Bootstrap the brand-new npm package interactively with maintainer 2FA and no automation token because trusted and staged publishing require an existing package.

After bootstrap, register the exact repository, publish workflow filename, and `npm` environment as the trusted publisher. Allow only `npm stage publish`, disallow token publishing, and require maintainer 2FA approval for every staged version.

## Disclosure

The maintainer will assess the report, prepare a remediation when applicable, and decide whether to publish a GitHub security advisory or request a CVE after the remediation is available.
