# zain-wedding — AWS CDK stack

Defines all AWS infra in one stack (`WeddingStack`):

- **DynamoDB** single table (`pk`/`sk`, provisioned 5/5 — within free tier) — likes & comments
- **S3** `MediaBucket` (images) + `DataBucket` (posts.json/stories.json) — both private
- **CloudFront** one distribution, OAC origins: default → media (immutable cache),
  `*.json` → data (5-min cache + CORS)
- **HTTP API Gateway** + **Lambda** (Node 20, ARM): `PostLike`, `PostComment`,
  `GetComments`, `AdminApi`. Throttling: default 10rps/5burst, like 5/5, comment 2/2.

No WAF, no Cognito. All within free tier.

## ⚠️ This repo is "build-first" — nothing has been deployed

The stack is **authored and validated locally only**. Validate with:

```bash
cd cdk
npm install
npm run synth        # cdk synth — offline, no AWS credentials needed
```

## Deploying later (when you choose an AWS account)

> The dev machine has multiple AWS profiles. **Pick the profile explicitly** so you
> don't deploy into the wrong account.

```bash
# 1. Bundle the Lambda deps FIRST (the asset ships node_modules)
cd ../backend && npm install --omit=dev && cd ../cdk

# 2. One-time per account/region
AWS_PROFILE=<your-profile> npx cdk bootstrap

# 3. Deploy with your real config
AWS_PROFILE=<your-profile> npx cdk deploy \
  -c allowedOrigins='["https://your-domain.pages.dev"]' \
  -c writeApiKey='<random-write-key>' \
  -c adminApiKey='<random-admin-key>'
```

### Outputs → frontend / admin config

| Output            | Used by                                            |
| ----------------- | -------------------------------------------------- |
| `ApiBaseUrl`      | frontend `VITE_API_BASE_URL`, admin `API_BASE`     |
| `CdnBaseUrl`      | frontend `VITE_DATA_BASE_URL` = `<CdnBaseUrl>`      |
| `DataBucketName`  | where `posts.json` / `stories.json` live           |
| `MediaBucketName` | image uploads (via admin presign)                  |
| `DynamoTableName` | likes/comments table                               |

`writeApiKey` → frontend `VITE_API_KEY`. `adminApiKey` → admin portal login.

After first deploy, upload the initial `posts.json`/`stories.json` to the data bucket
(or create content via the admin portal, which writes them for you).
