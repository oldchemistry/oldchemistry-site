# Old Chemistry Placeholder Site

Static credibility placeholder for oldchemistry.com.

## Local Preview

    python3 -m http.server 8087 --directory sites/oldchemistry

## Cloudflare Pages Deploy

Preferred:

1. Create or log into a Cloudflare account.
2. Create a Pages project named oldchemistry.
3. Connect a GitHub repo, or use Wrangler direct upload.
4. Build command: none.
5. Output directory: sites/oldchemistry if deploying from repo root, or . if the project root is this folder.
6. Add custom domain oldchemistry.com.

Direct upload, once authenticated:

    npm exec --yes wrangler -- pages deploy sites/oldchemistry --project-name oldchemistry

