import * as path from 'path'
import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins'
import * as logs from 'aws-cdk-lib/aws-logs'
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2'
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations'

export interface WeddingStackProps extends cdk.StackProps {
  /** Origins allowed by API Gateway CORS + CloudFront data CORS. */
  allowedOrigins: string[]
  /** Shared secret for write endpoints (POST /like, /comment). Empty = open. */
  writeApiKey: string
  /** Admin portal key (x-admin-key) for /admin/* routes. */
  adminApiKey: string
  /** Origins allowed to upload images to the media bucket (admin portal). */
  adminOrigins: string[]
}

const BACKEND_DIR = path.join(__dirname, '..', '..', 'backend')
const POSTS_KEY = 'posts.json'
const STORIES_KEY = 'stories.json'

export class WeddingStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: WeddingStackProps) {
    super(scope, id, props)

    const { allowedOrigins, writeApiKey, adminApiKey, adminOrigins } = props

    // ── DynamoDB single table ────────────────────────────────────────────────
    const table = new dynamodb.Table(this, 'WeddingTable', {
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PROVISIONED, // free tier: 25 RCU/25 WCU
      readCapacity: 5,
      writeCapacity: 5,
      removalPolicy: cdk.RemovalPolicy.RETAIN, // never destroy user data
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
    })

    // ── S3 buckets (private; CloudFront OAC only) ────────────────────────────
    const commonBucketProps: s3.BucketProps = {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    }
    const mediaBucket = new s3.Bucket(this, 'MediaBucket', {
      ...commonBucketProps,
      // Allow the admin portal browser to PUT images via presigned URLs.
      cors: [
        {
          allowedOrigins: adminOrigins,
          allowedMethods: [s3.HttpMethods.PUT, s3.HttpMethods.GET, s3.HttpMethods.HEAD],
          allowedHeaders: ['*'],
          maxAge: 3000,
        },
      ],
    })
    const dataBucket = new s3.Bucket(this, 'DataBucket', {
      ...commonBucketProps,
      cors: [
        {
          allowedOrigins,
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.HEAD],
          allowedHeaders: ['*'],
          maxAge: 3000,
        },
      ],
    })

    // ── CloudFront cache + response-header policies ──────────────────────────
    const imageCachePolicy = new cloudfront.CachePolicy(this, 'ImageCachePolicy', {
      defaultTtl: cdk.Duration.days(365),
      minTtl: cdk.Duration.days(365),
      maxTtl: cdk.Duration.days(365),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
    })
    const dataCachePolicy = new cloudfront.CachePolicy(this, 'DataCachePolicy', {
      defaultTtl: cdk.Duration.minutes(5),
      minTtl: cdk.Duration.seconds(0),
      maxTtl: cdk.Duration.minutes(5),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
    })

    const imageHeaders = new cloudfront.ResponseHeadersPolicy(this, 'ImageHeaders', {
      customHeadersBehavior: {
        customHeaders: [
          { header: 'Cache-Control', value: 'public, max-age=31536000, immutable', override: true },
        ],
      },
    })
    const dataHeaders = new cloudfront.ResponseHeadersPolicy(this, 'DataHeaders', {
      corsBehavior: {
        accessControlAllowOrigins: allowedOrigins,
        accessControlAllowHeaders: ['*'],
        accessControlAllowMethods: ['GET', 'HEAD'],
        accessControlAllowCredentials: false,
        originOverride: true,
      },
      customHeadersBehavior: {
        customHeaders: [{ header: 'Cache-Control', value: 'public, max-age=300', override: true }],
      },
    })
    const adminHeaders = new cloudfront.ResponseHeadersPolicy(this, 'AdminHeaders', {
      customHeadersBehavior: {
        customHeaders: [
          { header: 'Cache-Control', value: 'no-store, no-cache, must-revalidate', override: true },
        ],
      },
      securityHeadersBehavior: {
        contentTypeOptions: { override: true },
        frameOptions: { frameOption: cloudfront.HeadersFrameOption.DENY, override: true },
        referrerPolicy: { referrerPolicy: cloudfront.HeadersReferrerPolicy.NO_REFERRER, override: true },
        strictTransportSecurity: { accessControlMaxAge: cdk.Duration.days(365), includeSubdomains: true, override: true },
      },
    })

    // ── CloudFront distribution: images (default) + *.json (data) + /admin* ──
    const mediaOrigin = origins.S3BucketOrigin.withOriginAccessControl(mediaBucket)
    const dataOrigin = origins.S3BucketOrigin.withOriginAccessControl(dataBucket)

    const distribution = new cloudfront.Distribution(this, 'Cdn', {
      comment: 'zain-wedding media + data CDN',
      priceClass: cloudfront.PriceClass.PRICE_CLASS_200, // includes India edge locations
      defaultRootObject: '',
      defaultBehavior: {
        origin: mediaOrigin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: imageCachePolicy,
        responseHeadersPolicy: imageHeaders,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
      },
      additionalBehaviors: {
        '*.json': {
          origin: dataOrigin,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: dataCachePolicy,
          responseHeadersPolicy: dataHeaders,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        },
        '/admin*': {
          origin: dataOrigin,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          responseHeadersPolicy: adminHeaders,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        },
      },
    })
    const cdnBaseUrl = `https://${distribution.distributionDomainName}`

    // ── Lambda functions (plain Node 20 handlers, SDK bundled in asset) ──────
    const backendCode = lambda.Code.fromAsset(BACKEND_DIR, {
      exclude: ['*.md', '.gitignore', 'package-lock.json'],
    })
    const common: Omit<lambda.FunctionProps, 'handler'> = {
      runtime: lambda.Runtime.NODEJS_24_X,
      architecture: lambda.Architecture.ARM_64,
      code: backendCode,
      memorySize: 256,
      timeout: cdk.Duration.seconds(10),
    }
    // One explicit, one-month log group per function (avoids deprecated logRetention).
    const logGroup = (fnId: string) =>
      new logs.LogGroup(this, `${fnId}Logs`, {
        retention: logs.RetentionDays.ONE_MONTH,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      })

    const likeFn = new lambda.Function(this, 'PostLike', {
      ...common,
      handler: 'like.handler',
      logGroup: logGroup('PostLike'),
      environment: { TABLE_NAME: table.tableName, WRITE_API_KEY: writeApiKey },
    })
    const commentFn = new lambda.Function(this, 'PostComment', {
      ...common,
      handler: 'comment.handler',
      logGroup: logGroup('PostComment'),
      environment: {
        TABLE_NAME: table.tableName,
        WRITE_API_KEY: writeApiKey,
        MAX_COMMENTS: '25',
        MAX_COMMENT_LENGTH: '500',
      },
    })
    const getCommentsFn = new lambda.Function(this, 'GetComments', {
      ...common,
      handler: 'comments.handler',
      logGroup: logGroup('GetComments'),
      environment: { TABLE_NAME: table.tableName },
    })
    const adminFn = new lambda.Function(this, 'AdminApi', {
      ...common,
      handler: 'admin.handler',
      timeout: cdk.Duration.seconds(30),
      logGroup: logGroup('AdminApi'),
      environment: {
        DATA_BUCKET: dataBucket.bucketName,
        MEDIA_BUCKET: mediaBucket.bucketName,
        CDN_BASE_URL: cdnBaseUrl,
        ADMIN_API_KEY: adminApiKey,
        POSTS_KEY,
        STORIES_KEY,
      },
    })

    // ── IAM grants (least privilege) ─────────────────────────────────────────
    table.grantWriteData(likeFn)
    table.grantReadWriteData(commentFn)
    table.grantReadData(getCommentsFn)
    dataBucket.grantReadWrite(adminFn)
    mediaBucket.grantPut(adminFn) // presigned PUT signed with the admin role

    // ── HTTP API Gateway ─────────────────────────────────────────────────────
    const httpApi = new apigwv2.HttpApi(this, 'HttpApi', {
      apiName: 'zain-wedding-api',
      corsPreflight: {
        allowOrigins: allowedOrigins,
        allowMethods: [
          apigwv2.CorsHttpMethod.GET,
          apigwv2.CorsHttpMethod.POST,
          apigwv2.CorsHttpMethod.DELETE,
          apigwv2.CorsHttpMethod.OPTIONS,
        ],
        allowHeaders: ['content-type', 'x-api-key', 'x-admin-key'],
        maxAge: cdk.Duration.days(1),
      },
    })

    const route = (
      id: string,
      pathPattern: string,
      method: apigwv2.HttpMethod,
      fn: lambda.IFunction,
    ) =>
      httpApi.addRoutes({
        path: pathPattern,
        methods: [method],
        integration: new integrations.HttpLambdaIntegration(id, fn),
      })

    // Public — capture throttled routes so the stage can depend on them.
    const likeRoutes    = route('LikeInt',    '/like/{postId}',    apigwv2.HttpMethod.POST, likeFn)
    const commentRoutes = route('CommentInt', '/comment/{postId}', apigwv2.HttpMethod.POST, commentFn)
    route('GetCommentsInt', '/comments/{postId}', apigwv2.HttpMethod.GET, getCommentsFn)
    // Admin (single Lambda dispatches on routeKey)
    route('AdminPostsInt', '/admin/posts', apigwv2.HttpMethod.GET, adminFn)
    route('AdminCreatePostInt', '/admin/post', apigwv2.HttpMethod.POST, adminFn)
    route('AdminDeletePostInt', '/admin/post/{id}', apigwv2.HttpMethod.DELETE, adminFn)
    route('AdminStoriesInt', '/admin/stories', apigwv2.HttpMethod.GET, adminFn)
    route('AdminCreateStoryInt', '/admin/story', apigwv2.HttpMethod.POST, adminFn)
    route('AdminDeleteStoryInt', '/admin/story/{id}', apigwv2.HttpMethod.DELETE, adminFn)
    route('AdminPresignInt', '/admin/presign', apigwv2.HttpMethod.GET, adminFn)

    // Throttling: default 10 rps / 5 burst; tighter on write endpoints.
    const cfnStage = httpApi.defaultStage!.node.defaultChild as apigwv2.CfnStage
    cfnStage.defaultRouteSettings = { throttlingRateLimit: 10, throttlingBurstLimit: 5 }
    // RouteSettings is a raw CFN map keyed by routeKey; its values are NOT
    // camelCase-converted by CDK, so use CloudFormation-native PascalCase here.
    cfnStage.routeSettings = {
      'POST /like/{postId}': { ThrottlingRateLimit: 5, ThrottlingBurstLimit: 5 },
      'POST /comment/{postId}': { ThrottlingRateLimit: 2, ThrottlingBurstLimit: 2 },
    } as unknown as apigwv2.CfnStage['routeSettings']
    // Stage must be created after the routes it references in routeSettings exist.
    for (const r of [...likeRoutes, ...commentRoutes]) {
      cfnStage.node.addDependency(r)
    }

    // ── Outputs ──────────────────────────────────────────────────────────────
    new cdk.CfnOutput(this, 'ApiBaseUrl', { value: httpApi.apiEndpoint })
    new cdk.CfnOutput(this, 'CdnBaseUrl', { value: cdnBaseUrl })
    new cdk.CfnOutput(this, 'DataBucketName', { value: dataBucket.bucketName })
    new cdk.CfnOutput(this, 'MediaBucketName', { value: mediaBucket.bucketName })
    new cdk.CfnOutput(this, 'DynamoTableName', { value: table.tableName })
  }
}
