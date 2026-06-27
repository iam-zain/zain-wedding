#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib'
import { WeddingStack } from '../lib/wedding-stack'

const app = new cdk.App()

// Context-driven config (override with `-c key=value` at synth/deploy time).
const allowedOrigins = (app.node.tryGetContext('allowedOrigins') as string[] | undefined) ?? [
  'http://localhost:5173',
]
const writeApiKey = (app.node.tryGetContext('writeApiKey') as string | undefined) ?? ''
const adminApiKey = (app.node.tryGetContext('adminApiKey') as string | undefined) ?? 'CHANGE_ME_ADMIN_KEY'
const adminOrigins = (app.node.tryGetContext('adminOrigins') as string[] | undefined) ?? ['*']

new WeddingStack(app, 'WeddingStack', {
  allowedOrigins,
  writeApiKey,
  adminApiKey,
  adminOrigins,
  description: 'zain-wedding — S3 + CloudFront + DynamoDB + HTTP API + Lambda (free tier)',
  // env is intentionally omitted so `cdk synth` stays environment-agnostic
  // (no AWS account lookups / credentials required to validate the stack).
})
