/// <reference types="vite/client" />

// This file is the Vite-canonical location for declaring global triple-slash
// references to ambient types (Vite's `client` types provide `import.meta.env`
// typings so `import.meta.env.VITE_*` access lines typecheck under `tsc --strict`).
//
// tsconfig.app.json's `include: ["src"]` picks this file up automatically, so
// no `files[]` or explicit reference-path is needed in tsconfig.app.json.
//
// Why we need it here (rather than inline `/// <reference ... />` on
// src/lib/supabase.ts):
//   1. Single source-of-truth for the Vite-env typing across the whole SPA
//      subtree -- any future file that uses VITE_* or import.meta.env will
//      pick this up without per-file inline directives.
//   2. Keeps app/src/lib/supabase.ts clean (no `magic` triple-slash header
//      that onlookers would mistake for a hot-loaded module rather than a
//      compile-time-only reference).
//   3. Survives diagnostic `tsc <one-file>` invocations (e.g. the verbatim
//      ops-notes H3 §'Proposed one-line fix' verification command) because
//      vite/client.d.ts lives under `node_modules/vite`, which is in the
//      ambient type-graph regardless of which file tsc is invoked on.

export {};
