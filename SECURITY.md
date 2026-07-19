# Security Policy

## Secret handling

- Never commit real credentials, tokens, kubeconfigs, Docker credentials, or Terraform state.
- If a secret is discovered in source, treat it as a leak until proven otherwise.
- Remove it, rotate it, and report it through the normal maintainer process.

## Repository-wide scanners

The pipeline uses layered security checks:

- Gitleaks for repository-wide secret detection;
- Semgrep for source-pattern analysis;
- npm audit for Node-based dependency risk;
- pip-audit for Python dependency risk;
- Trivy for container image vulnerability scanning before any publish step.

## FastAPI advisory status

The FastAPI service is intentionally blocked from release because `pip-audit` fails on the ChromaDB advisory affecting `chromadb==1.5.9` (`PYSEC-2026-311`). That is a real release gate, not a transient test failure.

## Local data exclusions

The repository excludes local Chroma data, Python virtual environments, Terraform state, generated PDFs, and other machine-specific artifacts because they are environment outputs, not source of record.

## Reporting

If you find a credential or other sensitive value in this repository, do not paste it into chat or logs. Remove it from the file, rotate it if it was real, and notify the maintainer privately.

