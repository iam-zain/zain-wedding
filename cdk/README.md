# zain-wedding — AWS CDK stack

**Node**: 24 | **CDK**: 2.x | **Lambda runtime**: Node 24 (ARM)

Defines all AWS infra in one stack (`WeddingStack`):

- **DynamoDB** single table (`pk`/`sk`, provisioned 5/5 — within free tier) — likes & comments
- **S3** `MediaBucket` (images) + `DataBucket` (posts.json/stories.json) — both private
- **CloudFront** one distribution, OAC origins: default → media (immutable cache),
  `*.json` → data (5-min cache + CORS)
- **HTTP API Gateway** + **Lambda** (Node 24, ARM): `PostLike`, `PostComment`,
  `GetComments`, `AdminApi`. Throttling: default 10rps/5burst, like 5/5, comment 2/2.

No WAF, no Cognito. All within free tier.

---

## Local validation (no AWS needed)

```bash
cd cdk
npm install
npm run synth        # runs: cdk synth — offline, no credentials needed
```

---

## API keys — what they are and how to store them

Two secrets are required at deploy time:

| Key | Purpose |
|---|---|
| `writeApiKey` | Shared secret sent by the **frontend** as `x-api-key` header on every like/comment POST. Prevents anonymous spam from curl/bots. |
| `adminApiKey` | Password for the **admin portal**. Sent as `x-admin-key`. Guards content management routes. |

These are not stored in AWS — they are baked into Lambda environment variables at deploy time. You need to keep them somewhere so you can re-run `cdk deploy` in future without changing them (changing them = all clients stop working until you redeploy the frontend too).

### Storing secrets (gitignored file)

The repo's `.gitignore` already ignores `.env.local`. Use it:

```bash
# Run once — paste your generated keys in
cat > /Users/mdadilshahrukh/coding/zain-wedding/.env.local << 'EOF'
# zain-wedding deploy secrets
# Account: 889918307088 | Region: ap-south-1 | Profile: mdadils.dev
WRITE_API_KEY=<paste-your-write-key-here>
ADMIN_API_KEY=<paste-your-admin-key-here>
EOF
```

Then for every deploy:

```bash
set -a && source /Users/mdadilshahrukh/coding/zain-wedding/.env.local && set +a

AWS_PROFILE=mdadils.dev cdk deploy \
  -c allowedOrigins='["https://YOUR-SITE.pages.dev"]' \
  -c writeApiKey="$WRITE_API_KEY" \
  -c adminApiKey="$ADMIN_API_KEY"
```

---

## Required IAM permissions

The deploying IAM user needs two sets of permissions.

### Phase 1 — `cdk bootstrap` (one-time)

CDK creates a `CDKToolkit` CloudFormation stack with an S3 staging bucket, ECR repo, and 4 IAM execution roles.

| Service | Actions |
|---|---|
| **CloudFormation** | `CreateStack`, `UpdateStack`, `DescribeStacks`, `DescribeStackEvents`, `GetTemplate`, `CreateChangeSet`, `ExecuteChangeSet`, `DescribeChangeSet`, `DeleteChangeSet` |
| **S3** | `CreateBucket`, `PutBucketPolicy`, `PutBucketVersioning`, `PutBucketPublicAccessBlock`, `PutEncryptionConfiguration`, `PutLifecycleConfiguration`, `GetBucketLocation` |
| **ECR** | `CreateRepository`, `PutLifecyclePolicy`, `DescribeRepositories` |
| **IAM** | `CreateRole`, `PutRolePolicy`, `AttachRolePolicy`, `GetRole`, `PassRole`, `TagRole`, `DeleteRole`, `DetachRolePolicy`, `DeleteRolePolicy` |
| **SSM** | `PutParameter`, `GetParameter`, `DeleteParameter` |

### Phase 2 — `cdk deploy` (every deploy)

After bootstrap, CloudFormation runs as the CDK execution role (which has `AdministratorAccess`).
Your user only needs to trigger it and upload the Lambda zip asset.

| Service | Actions |
|---|---|
| **STS** | `AssumeRole` on `arn:aws:iam::<account>:role/cdk-*` |
| **CloudFormation** | `CreateChangeSet`, `ExecuteChangeSet`, `DescribeChangeSet`, `DescribeStacks`, `DescribeStackEvents`, `DeleteChangeSet`, `GetTemplate` |
| **S3** | `PutObject`, `GetObject`, `GetBucketLocation`, `ListBucket` — scoped to `cdk-hnb659fds-assets-<account>-<region>` |

> **Shortcut**: `PowerUserAccess` + `IAMFullAccess` on the deploying user covers both phases with no gaps.

---

## Step-by-step deployment

**Account**: `889918307088` | **Region**: `ap-south-1` (Mumbai) | **Profile**: `mdadils.dev`

`cdk` is installed globally on this machine — use `cdk` directly, not `npx cdk`.

### Step 0 — Generate and save API keys

```bash
# Generate two keys
openssl rand -hex 32   # → WRITE_API_KEY
openssl rand -hex 32   # → ADMIN_API_KEY

# Save them (see "Storing secrets" section above)
```

### Step 1 — Install backend `node_modules` (Lambda asset ships them)

```bash
cd /Users/mdadilshahrukh/coding/zain-wedding/backend
npm install --omit=dev
```

### Step 2 — Install CDK deps

```bash
cd /Users/mdadilshahrukh/coding/zain-wedding/cdk
npm install
```

### Step 3 — Validate synth (no credentials needed)

```bash
cd /Users/mdadilshahrukh/coding/zain-wedding/cdk

set -a && source ../.env.local && set +a

cdk synth \
  -c allowedOrigins='["*"]' \
  -c writeApiKey="$WRITE_API_KEY" \
  -c adminApiKey="$ADMIN_API_KEY"
```

Expect a large CloudFormation YAML ending in `Successfully synthesized`.

### Step 4 — Bootstrap CDK (one-time per account/region)

```bash
AWS_PROFILE=mdadils.dev cdk bootstrap aws://889918307088/ap-south-1
```

Takes ~2 min. Success: `✅ Environment aws://889918307088/ap-south-1 bootstrapped.`

If you hit `AccessDenied`, note the exact action name — that is the IAM permission gap to add.

### Step 5 — Deploy

```bash
cd /Users/mdadilshahrukh/coding/zain-wedding/cdk

set -a && source ../.env.local && set +a

AWS_PROFILE=mdadils.dev cdk deploy \
  -c allowedOrigins='["https://YOUR-SITE.pages.dev"]' \
  -c writeApiKey="$WRITE_API_KEY" \
  -c adminApiKey="$ADMIN_API_KEY"
```

CDK shows the resource diff and asks `Do you wish to deploy these changes (y/n)?` — type `y`.

Deploy takes 5–10 min (CloudFront is the slow part).

### Step 6 — Note the outputs

```
Outputs:
WeddingStack.ApiBaseUrl      = https://<id>.execute-api.ap-south-1.amazonaws.com
WeddingStack.CdnBaseUrl      = https://<id>.cloudfront.net
WeddingStack.DataBucketName  = weddingstack-databucket-<id>
WeddingStack.MediaBucketName = weddingstack-mediabucket-<id>
WeddingStack.DynamoTableName = WeddingStack-WeddingTable-<id>
```

Frontend env mapping:

| CDK Output | Frontend var |
|---|---|
| `ApiBaseUrl` | `VITE_API_BASE_URL` |
| `CdnBaseUrl` | `VITE_DATA_BASE_URL` |
| `$WRITE_API_KEY` | `VITE_API_KEY` |
| `$ADMIN_API_KEY` | admin portal login |

### Step 7 — Upload initial data

```bash
AWS_PROFILE=mdadils.dev aws s3 cp \
  /Users/mdadilshahrukh/coding/zain-wedding/public/posts.json \
  s3://<DataBucketName>/posts.json

AWS_PROFILE=mdadils.dev aws s3 cp \
  /Users/mdadilshahrukh/coding/zain-wedding/public/stories.json \
  s3://<DataBucketName>/stories.json
```

Or create content via the admin portal — it writes these files for you.

---

## Re-deploying (code or config changes)

Re-run Step 1 (backend `npm install`) any time Lambda code or its deps change, then re-run Step 5.

## Outputs reference

| Output | Used by |
|---|---|
| `ApiBaseUrl` | frontend `VITE_API_BASE_URL`, admin `API_BASE` |
| `CdnBaseUrl` | frontend `VITE_DATA_BASE_URL` |
| `DataBucketName` | where `posts.json` / `stories.json` live |
| `MediaBucketName` | image uploads (via admin presign) |
| `DynamoTableName` | likes/comments table |
