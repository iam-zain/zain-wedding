#!/usr/bin/env bash
# Uploads admin/index.html to the data bucket — served permanently via CloudFront /admin*.
# Injects tier secrets from config/site.json into the HTML before uploading so the
# admin never has to enter them manually.
# Run from any directory.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BUCKET="weddingstack-databuckete3889a50-dxgcpbleovmw"
KEY="admin/index.html"
PROFILE="mdadils.dev"
REGION="ap-south-1"
CDN_URL="https://d1py21cjb1vbrh.cloudfront.net/admin/index.html"

# Inject accessTiers from config/site.json into the placeholder comment.
TEMP_HTML="$(mktemp).html"
INJECT_SCRIPT="$(mktemp).js"

cat > "$INJECT_SCRIPT" << 'EOF'
const fs = require('fs')
const [,, repoRoot, src, dest] = process.argv
const site = JSON.parse(fs.readFileSync(repoRoot + '/config/site.json', 'utf8'))
const secrets = JSON.stringify(site.accessTiers || {})
const html = fs.readFileSync(src, 'utf8')
fs.writeFileSync(dest, html.replace('null // __TIER_SECRETS__', secrets))
EOF

node "$INJECT_SCRIPT" "$REPO_ROOT" "${SCRIPT_DIR}/index.html" "$TEMP_HTML"
rm -f "$INJECT_SCRIPT"

echo "Uploading admin console..."
aws s3 cp "${TEMP_HTML}" "s3://${BUCKET}/${KEY}" \
  --profile        "$PROFILE" \
  --region         "$REGION" \
  --content-type   "text/html; charset=utf-8" \
  --cache-control  "no-store" \
  --no-guess-mime-type

rm -f "${TEMP_HTML}"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Admin console (permanent URL):"
echo ""
echo "  $CDN_URL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
