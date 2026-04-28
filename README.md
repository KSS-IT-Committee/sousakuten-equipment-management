# sousakuten-equipment-management

This repository is hosted for managing the equipments for Sousakuten, an event held by Tokyo Metropolitan Koishikawa Secondary School. 

The page is expected to be used ONLY by the members of Koishikawa Secondary School.

## Local preview from CI

Each push to `main` and each pull request builds a Docker image and pushes it to GHCR. To run a build locally (with a postgres sidecar):

```bash
./scripts/preview.sh           # latest from main
./scripts/preview.sh pr-12     # build from PR #12
```

The app listens on http://localhost:3000 and is wired to a fresh postgres via `DATABASE_URL=postgres://equipment:equipment@db:5432/equipment`. Data is ephemeral — each run starts with a clean database.

The image is published at `ghcr.io/<owner>/<repo>/preview`. After the first CI run, flip the package's visibility to **Public** in GitHub → repo → Packages → preview → Package settings, otherwise pulling requires `docker login ghcr.io` with a PAT that has `read:packages`.