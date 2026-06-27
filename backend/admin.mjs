import { randomUUID } from 'node:crypto'
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { badRequest, notFound, ok, parseBody, serverError, unauthorized } from './lib/http.mjs'
import { checkAdminKey } from './lib/sanitize.mjs'

const s3 = new S3Client({})
const DATA_BUCKET = process.env.DATA_BUCKET
const MEDIA_BUCKET = process.env.MEDIA_BUCKET
const CDN_BASE_URL = (process.env.CDN_BASE_URL || '').replace(/\/$/, '')
const POSTS_KEY = process.env.POSTS_KEY || 'posts.json'
const STORIES_KEY = process.env.STORIES_KEY || 'stories.json'

async function readJson(key, fallback) {
  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: DATA_BUCKET, Key: key }))
    const text = await res.Body.transformToString()
    return JSON.parse(text)
  } catch (err) {
    if (err?.name === 'NoSuchKey' || err?.$metadata?.httpStatusCode === 404) return fallback
    throw err
  }
}

async function writeJson(key, obj) {
  await s3.send(
    new PutObjectCommand({
      Bucket: DATA_BUCKET,
      Key: key,
      Body: JSON.stringify(obj, null, 2),
      ContentType: 'application/json',
      CacheControl: 'public, max-age=300',
    }),
  )
}

const toAccess = (a) => (Array.isArray(a) ? a.map(Number).filter((n) => Number.isInteger(n)) : [0])

// ── Route handlers ───────────────────────────────────────────────────────────
async function listPosts() {
  return ok(await readJson(POSTS_KEY, { posts: [] }))
}

async function createPost(event) {
  const b = parseBody(event)
  const post = {
    id: `post_${randomUUID().slice(0, 8)}`,
    title: String(b.title || ''),
    description: String(b.description || ''),
    images: Array.isArray(b.images) ? b.images.filter(Boolean) : [],
    likes_base: Number(b.likes_base || 0),
    access: toAccess(b.access),
    active_from: b.active_from || new Date().toISOString(),
    active_upto: b.active_upto || '2099-12-31T00:00:00Z',
    created_at: new Date().toISOString(),
    hidden: false,
  }
  if (post.images.length === 0) return badRequest('at least one image required')
  const data = await readJson(POSTS_KEY, { posts: [] })
  data.posts = [post, ...(data.posts || [])]
  await writeJson(POSTS_KEY, data)
  return ok(post)
}

async function deletePost(event) {
  const id = event.pathParameters?.id
  if (!id) return badRequest('id required')
  const data = await readJson(POSTS_KEY, { posts: [] })
  const post = (data.posts || []).find((p) => p.id === id)
  if (!post) return notFound('post not found')
  post.hidden = true // soft delete — nothing is removed
  await writeJson(POSTS_KEY, data)
  return ok({ id, hidden: true })
}

async function listStories() {
  return ok(await readJson(STORIES_KEY, { stories: [] }))
}

async function createStory(event) {
  const b = parseBody(event)
  const story = {
    id: `story_${randomUUID().slice(0, 8)}`,
    imageUrl: String(b.imageUrl || ''),
    label: b.label ? String(b.label) : undefined,
    access: toAccess(b.access),
    expires_at: b.expires_at || '2099-12-31T00:00:00Z',
    created_at: new Date().toISOString(),
    hidden: false,
  }
  if (!story.imageUrl) return badRequest('imageUrl required')
  const data = await readJson(STORIES_KEY, { stories: [] })
  data.stories = [story, ...(data.stories || [])]
  await writeJson(STORIES_KEY, data)
  return ok(story)
}

async function deleteStory(event) {
  const id = event.pathParameters?.id
  if (!id) return badRequest('id required')
  const data = await readJson(STORIES_KEY, { stories: [] })
  const story = (data.stories || []).find((s) => s.id === id)
  if (!story) return notFound('story not found')
  story.hidden = true // soft delete
  await writeJson(STORIES_KEY, data)
  return ok({ id, hidden: true })
}

async function presign(event) {
  const q = event.queryStringParameters || {}
  const filename = (q.filename || 'upload.bin').replace(/[^a-zA-Z0-9._-]/g, '_')
  const contentType = q.contentType || 'application/octet-stream'
  const key = `uploads/${randomUUID()}-${filename}`
  const uploadUrl = await getSignedUrl(
    s3,
    new PutObjectCommand({ Bucket: MEDIA_BUCKET, Key: key, ContentType: contentType }),
    { expiresIn: 300 },
  )
  return ok({ uploadUrl, key, publicUrl: `${CDN_BASE_URL}/${key}` })
}

// ── Dispatcher ───────────────────────────────────────────────────────────────
const ROUTES = {
  'GET /admin/posts': listPosts,
  'POST /admin/post': createPost,
  'DELETE /admin/post/{id}': deletePost,
  'GET /admin/stories': listStories,
  'POST /admin/story': createStory,
  'DELETE /admin/story/{id}': deleteStory,
  'GET /admin/presign': presign,
}

export const handler = async (event) => {
  if (!checkAdminKey(event)) return unauthorized()
  const fn = ROUTES[event.routeKey]
  if (!fn) return notFound(`unknown route: ${event.routeKey}`)
  try {
    return await fn(event)
  } catch (err) {
    console.error('admin error', event.routeKey, err)
    return serverError()
  }
}
