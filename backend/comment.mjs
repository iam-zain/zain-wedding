import { randomUUID } from 'node:crypto'
import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { ddb, TABLE } from './lib/dynamo.mjs'
import { badRequest, conflict, ok, parseBody, serverError, unauthorized } from './lib/http.mjs'
import { checkWriteKey, stripHtml } from './lib/sanitize.mjs'

const MAX_COMMENTS = Number(process.env.MAX_COMMENTS || 25)
const MAX_LEN = Number(process.env.MAX_COMMENT_LENGTH || 500)

// POST /comment/{postId}
export const handler = async (event) => {
  if (!checkWriteKey(event)) return unauthorized()

  const postId = event.pathParameters?.postId
  if (!postId) return badRequest('postId required')

  let body
  try {
    body = parseBody(event)
  } catch {
    return badRequest('invalid json body')
  }

  const text = stripHtml(body.text).slice(0, MAX_LEN)
  const userName = stripHtml(body.userName).slice(0, 40)
  const userId = String(body.userId || '').trim().slice(0, 100)

  if (!text) return badRequest('text required')
  if (!userName) return badRequest('userName required')
  if (!userId) return badRequest('userId required')

  try {
    // Enforce per-post comment cap.
    const countRes = await ddb.send(
      new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :c)',
        ExpressionAttributeValues: { ':pk': `POST#${postId}`, ':c': 'COMMENT#' },
        Select: 'COUNT',
      }),
    )
    if ((countRes.Count || 0) >= MAX_COMMENTS) return conflict('comment limit reached')

    const createdAt = new Date().toISOString()
    const id = randomUUID()
    await ddb.send(
      new PutCommand({
        TableName: TABLE,
        Item: { pk: `POST#${postId}`, sk: `COMMENT#${createdAt}#${id}`, id, text, userId, userName, createdAt },
      }),
    )
    return ok({ id, text, userId, userName, createdAt })
  } catch (err) {
    console.error('comment error', err)
    return serverError()
  }
}
