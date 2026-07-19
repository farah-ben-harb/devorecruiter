# DevoRecruiter 

This repository is the source monorepo for DevoRecruiter. It consolidates the application code, runtime containers, workflow exports, and Terraform source that previously lived in separate repositories.

## Repository layout

- `apps/frontend/` - Angular frontend
- `apps/api-bff/` - NestJS backend-for-frontend
- `apps/api-back/` - FastAPI service
- `automation/n8n/` - sanitized n8n workflow exports
- `infrastructure/terraform/` - infrastructure-as-code source
- `.github/workflows/pipeline.yml` - the only repository workflow

## Local development

Frontend:

```bash
cd apps/frontend
npm ci
npm run lint:ci
npm run typecheck
npm run test:ci
npm run build
```

BFF:

```bash
cd apps/api-bff
npm ci
npm test
npm run build
```

FastAPI:

```bash
cd apps/api-back
python -m venv .venv
.venv\Scripts\activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

## Pipeline behavior

The GitHub Actions pipeline is path-aware. Shared repository controls rerun all relevant chains, while app-specific changes only run the matching chain.

Security gates stay independent:

- frontend publication depends on frontend CI, frontend security, Trivy, and the repository-wide secret scan;
- BFF publication depends on BFF CI, BFF security, Trivy, and the repository-wide secret scan;
- FastAPI publication is intentionally blocked by the current ChromaDB advisory and must not be forced through.

## Docker image strategy

Keep the three service images separate in Docker Hub:

- `benharbfarah/devorecruiter-front`
- `benharbfarah/devorecruiter-api-bff`
- `benharbfarah/devorecruiter-api-back`

Each image is tagged only with the full Git SHA:

```text
${{ github.sha }}
```

No mutable tags are used.

## GitOps boundary

The future GitOps repository is intentionally separate and is not part of this source monorepo. This repository does not contain Helm charts, Argo CD Applications, or desired-state deployment values.

## FastAPI status

The FastAPI service remains runtime-ready, but publication is blocked until the ChromaDB advisory on `chromadb==1.5.9` is resolved. The pipeline preserves that gate instead of weakening it.

## No direct deployment

This repository produces validated source and container images only. It does not deploy applications directly.

