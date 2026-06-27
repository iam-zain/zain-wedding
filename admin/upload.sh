#!/usr/bin/env bash
# Uploads admin/index.html to the data bucket — served permanently via CloudFront /admin*.
# Run from any directory.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUCKET="weddingstack-databuckete3889a50-dxgcpbleovmw"
KEY="admin/index.html"
PROFILE="mdadils.dev"
REGION="ap-south-1"
CDN_URL="https://d1py21cjb1vbrh.cloudfront.net/admin/index.html"

echo "Uploading admin console..."
aws s3 cp "${SCRIPT_DIR}/index.html" "s3://${BUCKET}/${KEY}" \
  --profile        "$PROFILE" \
  --region         "$REGION" \
  --content-type   "text/html; charset=utf-8" \
  --cache-control  "no-store" \
  --no-guess-mime-type

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Admin console (permanent URL):"
echo ""
echo "  $CDN_URL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
