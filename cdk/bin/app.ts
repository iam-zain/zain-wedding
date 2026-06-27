#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib'
import { WeddingStack } from '../lib/wedding-stack'

const app = new cdk.App()

// Context-driven config (override with `-c key=value` at synth/deploy time).
// When a value comes from -c on the CLI it arrives as a raw string, even if it's JSON.
// cdk.json values are pre-parsed. Handle both.
const parseList = (raw: unknown, fallback: string[]): string[] => {
  if (!raw) return fallback
  if (Array.isArray(raw)) return raw as string[]
  try { return JSON.parse(raw as string) } catch { return [raw as string] }
}

const allowedOrigins = parseList(app.node.tryGetContext('allowedOrigins'), ['http://localhost:5173'])
const adminOrigins   = parseList(app.node.tryGetContext('adminOrigins'),   ['*'])
const writeApiKey    = (app.node.tryGetContext('writeApiKey')  as string | undefined) ?? ''
const adminApiKey    = (app.node.tryGetContext('adminApiKey')  as string | undefined) ?? 'CHANGE_ME_ADMIN_KEY'

new WeddingStack(app, 'WeddingStack', {
  allowedOrigins,
  writeApiKey,
  adminApiKey,
  adminOrigins,
  description: 'zain-wedding — S3 + CloudFront + DynamoDB + HTTP API + Lambda (free tier)',
  // env is intentionally omitted so `cdk synth` stays environment-agnostic
  // (no AWS account lookups / credentials required to validate the stack).
})
