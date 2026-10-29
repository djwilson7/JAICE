# Cloudflare deployment

This site uses Workers Static Assets, with no server entry point or runtime backend.

Worker: jaice
Public address: https://jaice.dontaiwilson.com

## GitHub automatic deployments

Connect the existing repository to this Worker and use branch main. Leave the root directory blank.

Build command: `npm ci && npm run build`
Deploy command: `npx wrangler deploy`
Published files: `dist/`

Set NODE_VERSION=24.13.1, SKIP_DEPENDENCY_INSTALL=true, and NEXT_TELEMETRY_DISABLED=1 as build variables. The explicit build command installs from the committed lockfile. Runtime variables are not used by static assets.

Set VITE_PROJECT_MODE=demo. Preserve the four security headers in public/_headers. SPA fallback is required for direct application routes.

The root wrangler.jsonc defines the asset directory and HTML routing. Custom domains are managed through the Cloudflare dashboard; omit route/routes keys so Git deployments preserve those domain attachments. Publish only the generated files, never the repository or .env files. Do not enable automatic framework conversion to a server runtime.

## Verification and rollback

Verify the GitHub-triggered build succeeds, HTTPS and direct nested paths load, missing pages have the intended status, and headers and SEO metadata match the exported files.

Retain the Render deployment for rollback. DNS rollback restores the recorded CNAME web targets; it does not require changing mail records. AssignmentAssistant is excluded from this migration.
