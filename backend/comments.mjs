import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import { ddb, TABLE } from './lib/dynamo.mjs'
import { badRequest, ok, serverError } from './lib/http.mjs'

// GET /comments/{postId} — all comments, ascending by createdAt. No auth.
export const handler = async (event) => {
  const postId = event.pathParameters?.postId
  if (!postId) return badRequest('postId required')

  try {
    const res = await ddb.send(
      new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :c)',
        ExpressionAttributeValues: { ':pk': `POST#${postId}`, ':c': 'COMMENT#' },
        ScanIndexForward: true, // sk embeds an ISO timestamp → chronological order
      }),
    )
    const comments = (res.Items || []).map((i) => ({
      id: i.id,
      text: i.text,
      userId: i.userId,
      userName: i.userName,
      createdAt: i.createdAt,
    }))
    return ok(comments)
  } catch (err) {
    console.error('getComments error', err)
    return serverError()
  }
}
