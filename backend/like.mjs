import { UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb'
import { ddb, TABLE } from './lib/dynamo.mjs'
import { badRequest, ok, serverError, unauthorized } from './lib/http.mjs'
import { checkWriteKey } from './lib/sanitize.mjs'

// POST /like/{postId} — atomic +1 on POST#{postId}/LIKES, returns updated count.
export const handler = async (event) => {
  const method = event.requestContext?.http?.method || event.httpMethod || 'POST'

  const postId = event.pathParameters?.postId
  if (!postId) return badRequest('postId required')

  // GET /like/{postId} -> return current count (no auth)
  if (method === 'GET') {
    try {
      const res = await ddb.send(
        new GetCommand({ TableName: TABLE, Key: { pk: `POST#${postId}`, sk: 'LIKES' } }),
      )
      return ok({ count: Number(res.Item?.count ?? 0) })
    } catch (err) {
      console.error('get like error', err)
      return serverError()
    }
  }

  // POST /like/{postId} -> increment (requires write key)
  if (!checkWriteKey(event)) return unauthorized()

  try {
    const res = await ddb.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { pk: `POST#${postId}`, sk: 'LIKES' },
        UpdateExpression: 'ADD #c :one',
        ExpressionAttributeNames: { '#c': 'count' },
        ExpressionAttributeValues: { ':one': 1 },
        ReturnValues: 'UPDATED_NEW',
      }),
    )
    return ok({ count: Number(res.Attributes?.count ?? 0) })
  } catch (err) {
    console.error('like error', err)
    return serverError()
  }
}
