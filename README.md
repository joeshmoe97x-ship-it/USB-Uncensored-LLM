# USB-Uncensored-LLM (Linux)

A five-surface deploy-target repo for portable, uncensored-LLM deliverable on a Linux USB stick + a web-app/Supabase dashboard pair. This README is the orientation surface for new visitors; sub-READMEs ship with each deploy surface.

## Deploy Surfaces

| Surface                          | Path                | Deploy target                  | Doc surface                                                                                                                |
| -------------------------------- | ------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| **USB-portable Portable AI**     | `install.sh`, `start.sh` | A Linux desktop with `$USB_ROOT/Shared/` provisioned    | This README, [`install.sh`](#installsh--startsh) section below. Shared/ subtree lives outside this repo.                  |
| **Web app / SPA dashboard**      | `app/`              | Static hosting (nginx/Caddyfile)                              | [`app/README.md`](app/README.md), [`app/docs/DEPLOYMENT.md`](app/docs/DEPLOYMENT.md)                                       |
| **Supabase backend (local)**     | `app/supabase/`     | Supabase CLI 2.107.0 local stack                              | [`docs/deployment-backend.md`](docs/deployment-backend.md)                                                                 |
| **OmniSight middleware (deferred)** | `app/src/components/DeploymentGuide.tsx` | n/a (deferred to v3.3.x)                          | inline snippets — see the DeploymentGuide.tsx source                                                                       |
| **Release/bundle integrity**     | GitHub Releases v29.bundle | External consumer (`bundle install snippet`)             | [`app/scripts/install-smoke-test.sh`](app/scripts/install-smoke-test.sh) + ops-notes [releases-install-snippet-bug] retro |

Each surface has a different readiness level; the v3.2.0 deploy-readiness cycle covered the first three. Surfaces 4 + 5 are documented-but-not-yet-shipped.

## install.sh + start.sh (USB-portable Portable AI)

The `Linux/` folder at the root of this repo is the canonical Linux sub-tree of the USB deliverable. The Shared/ subtree (carrying the Ollama runtime + chat_server.py + model catalog UI assets) lives OUTSIDE this repo and is provisioned by the upstream maintainer at build time. New contributors:

```bash
# Fresh host (USB drive plugged in):
bash Linux/install.sh    # 7-step orchestrator (model select + download + Modelfile + Ollama import)
bash Linux/start.sh      # Fast-web-chat server launch (Ollama readiness poll + chat_server.py)
```

Production-safety notes (see head comments of each script for provenance):

- `start.sh` reads `OLLAMA_HOST=127.0.0.1:11434` (IPv4 loopback only -- single-user portable USB).
- The `--lan` LAN-binding flag is deferred to v3.3.x -- uncensored-LLM zero-trust-LAN exposure is a Tier 1 risk.
- `install.sh` fail-fast with `ERROR: Missing shared config query script` -- Shared/ canonical-URL resolution deferred to v3.3.x.

## Sub-READMEs

For details per-surface:

- [`app/README.md`](app/README.md) -- SPA dev/build/preview + Vite + Supabase wiring
- [`app/docs/DEPLOYMENT.md`](app/docs/DEPLOYMENT.md) -- SPA host deploy notes (nginx/Caddyfile placeholder)
- [`docs/deployment-backend.md`](docs/deployment-backend.md) -- Supabase CLI production deploy walkthrough

## Operational + archeology audit-chain

The `audit_script.sh` + drift-detector triad enforces archeology invariants end-to-end. The Open Adoption tripod convention, anchor covenant inventory, and audit-note state-grouped census are documented at:

- [`app/docs/ops-notes.md`](app/docs/ops-notes.md) -- canonical operational notes anchor
- [`app/docs/ops-notes.md ## Adopted: archeology-cycle meta-extension (v3.1.5)`](app/docs/ops-notes.md) -- forward-extension surface for v3.1.5.x.x.x sub-cycles
- [`docs/anchor-ledger.md`](docs/anchor-ledger.md) -- canonical anchor-resolved ledger

## Tag Chain

Synced with the audit-chain tag chain. The v3.2.0 deploy-readiness cycle is the most-recent significant change to deploy surfaces; see the [Release Notes section in `app/docs/ops-notes.md`](app/docs/ops-notes.md) for cycle-by-cycle changelog.
