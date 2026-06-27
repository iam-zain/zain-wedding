import { UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { ddb, TABLE } from './lib/dynamo.mjs'
import { badRequest, ok, serverError, unauthorized } from './lib/http.mjs'
import { checkWriteKey } from './lib/sanitize.mjs'

// POST /like/{postId} — atomic +1 on POST#{postId}/LIKES, returns updated count.
export const handler = async (event) => {
  if (!checkWriteKey(event)) return unauthorized()

  const postId = event.pathParameters?.postId
  if (!postId) return badRequest('postId required')

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
