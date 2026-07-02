# Front-end (SPA) production deploy

Production host wiring for the `omnisight-dashboard` Vite SPA. Outputs a static `app/dist/` (single-page HTML + JS + CSS + a few assets); served by any static-file server through a reverse proxy.

## Build

```bash
cd app
# Stage production env vars (NEVER commit .env.production):
cp .env.production.example .env.production
$EDITOR .env.production         # replace [REDACTED: ...] placeholders

npm run build                   # outputs dist/ (HTML + JS + CSS + assets)
```

The build step is fully deterministic given the env-vars (Vite's static-replace + rollup treeshaking + CSS minify). No server-side runtime required.

## Host wiring placeholder (nginx + Caddyfile, TBD v3.3.x)

```nginx
# /etc/nginx/sites-available/omnisight-dashboard.conf (placeholder -- TBD v3.3.x)
server {
    listen 443 ssl http2;
    server_name dashboard.<your-domain>;

    root /var/www/omnisight-dashboard/dist;
    index index.html;

    # SPA fallback: any non-/assets/ path falls through to index.html so client-side router takes over
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache busted for hashed asset bundles; never cache index.html
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    location = /index.html {
        expires -1;
        add_header Cache-Control "no-cache, must-revalidate";
    }

    ssl_certificate     /etc/letsencrypt/live/<your-domain>/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/<your-domain>/privkey.pem;
}
```

For Caddyfile-equivalent (placeholder):

```caddyfile
# /etc/caddy/Caddyfile (placeholder -- TBD v3.3.x)
dashboard.<your-domain> {
    root * /var/www/omnisight-dashboard/dist
    encode gzip zstd
    file_server
    @spa path /! /assets/*
    rewrite @spa /index.html
}
```

## Smoke

```bash
npm run preview                 # serves dist/ at http://127.0.0.1:4173/ for local verification
curl -fsS http://127.0.0.1:4173/ | grep -q omnisight-dashboard   # confirm SPA HTML bundle loads
```

A CI `vite preview` smoke step (deferred to v3.3.x; see OPEN-marker in `app/.github/workflows/e2e-quick.yml`) catches production-build regressions before the heavier full-e2e suite.

## Sub-doc cross-links

- [`../../../docs/deployment-backend.md`](../../docs/deployment-backend.md) -- Supabase backend production walkthrough (db push + functions deploy + secrets set)
- [`../ops-notes.md`](../ops-notes.md) -- canonical operational notes anchor
