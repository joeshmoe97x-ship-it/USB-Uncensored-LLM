#!/bin/bash
# ----------------------------------------------------------------------------
# Provenance: introduced by `0f5d809` (`add uninstaller scripts`, audit-chain adoption v2.3).
# Tripod Closure: see `../../app/docs/ops-notes.md` #deferred-linux-portable-ollama-runtime-audit-chain-adoption (USB-delivery-layer — the deferred deferral this commit adopts).
# Anchor Covenant (single-bridge): strictly depends on `$COMMON_UNINSTALL` (path-resolved `$USB_ROOT/Shared/scripts/uninstall-common.sh`) being present + executable; the load-bearing line is the arg-pass `linux` to the shared script.
# Disambiguation: USB-portable Linux-uninstall shim; thin delegation to `$COMMON_UNINSTALL` with `linux` arg; does NOT carry the actual uninstall logic (which lives in `Shared/`).
# Tag Chain: synced as of audit-cycle-v2.3.
# ----------------------------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
USB_ROOT="$(dirname "$SCRIPT_DIR")"
COMMON_UNINSTALL="$USB_ROOT/Shared/scripts/uninstall-common.sh"

if [ ! -f "$COMMON_UNINSTALL" ]; then
  echo "ERROR: Missing shared uninstaller script:"
  echo "  $COMMON_UNINSTALL"
  exit 1
fi

bash "$COMMON_UNINSTALL" linux
