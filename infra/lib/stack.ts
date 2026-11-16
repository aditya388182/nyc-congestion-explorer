import { join } from "node:path";
import { CfnOutput, Duration, Fn, RemovalPolicy, Stack } from "aws-cdk-lib";
import type { StackProps } from "aws-cdk-lib";
import { HttpApi, HttpMethod, HttpStage } from "aws-cdk-lib/aws-apigatewayv2";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import {
  AllowedMethods,
  CachePolicy,
  Distribution,
  HeadersFrameOption,
  HeadersReferrerPolicy,
  OriginRequestPolicy,
  ResponseHeadersPolicy,
  ViewerProtocolPolicy,
} from "aws-cdk-lib/aws-cloudfront";
import { HttpOrigin, S3BucketOrigin } from "aws-cdk-lib/aws-cloudfront-origins";
import { Architecture, Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction, OutputFormat } from "aws-cdk-lib/aws-lambda-nodejs";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { BlockPublicAccess, Bucket, BucketEncryption } from "aws-cdk-lib/aws-s3";
import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
import type { Construct } from "constructs";

export interface CongestionStackProps extends StackProps {
  /** Built web app (web/dist). */
  webDistPath: string;
  /** Repository root (for api/src/lambda.ts and api/data). */
  repoRoot: string;
}

/** Content-Security-Policy for the app: same-origin only; MapLibre needs blob workers and inline styles. */
export const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "worker-src 'self' blob:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

export class CongestionStack extends Stack {
  readonly siteBucket: Bucket;
  readonly distribution: Distribution;
  readonly api: HttpApi;

  constructor(scope: Construct, id: string, props: CongestionStackProps) {
    super(scope, id, props);

    // ---- API: Lambda (arm64, Node 24) with the panel bundled in ----
    const logGroup = new LogGroup(this, "ApiLogs", { retention: RetentionDays.TWO_WEEKS, removalPolicy: RemovalPolicy.DESTROY });
    const fn = new NodejsFunction(this, "ApiFunction", {
      entry: join(props.repoRoot, "api", "src", "lambda.ts"),
      handler: "handler",
      runtime: Runtime.NODEJS_24_X,
      architecture: Architecture.ARM_64,
      memorySize: 1024,
      timeout: Duration.seconds(10),
      logGroup,
      environment: { NODE_ENV: "production", LOG_LEVEL: "info", NODE_OPTIONS: "--enable-source-maps" },
      // no reservedConcurrentExecutions: new accounts often have a limit of 10, leaving nothing to reserve.
      // API Gateway throttling bounds cost instead (DECISIONS / SPEC design decision 4).
      bundling: {
        format: OutputFormat.ESM,
        target: "node24",
        minify: true,
        sourceMap: true,
        mainFields: ["module", "main"],
        banner: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);",
        forceDockerBundling: false,
        commandHooks: {
          beforeBundling: () => [],
          beforeInstall: () => [],
          // the weekly panel, zone shapes, precomputed results and the GraphQL schema travel in the bundle
          afterBundling: (inputDir: string, outputDir: string) => [
            `cp -r ${join(inputDir, "api", "data")} ${join(outputDir, "data")}`,
            `cp ${join(inputDir, "api", "src", "schema.graphql")} ${join(outputDir, "schema.graphql")}`,
          ],
        },
      },
    });

    // ---- HTTP API: POST /graphql (and GET /graphql for the health check), throttled ----
    this.api = new HttpApi(this, "HttpApi", { createDefaultStage: false, description: "Congestion explorer GraphQL API" });
    new HttpStage(this, "DefaultStage", {
      httpApi: this.api,
      autoDeploy: true,
      throttle: { rateLimit: 20, burstLimit: 40 },
    });
    this.api.addRoutes({
      path: "/graphql",
      methods: [HttpMethod.POST, HttpMethod.GET],
      integration: new HttpLambdaIntegration("ApiIntegration", fn),
    });

    // ---- Web: private S3 bucket behind CloudFront with Origin Access Control ----
    this.siteBucket = new Bucket(this, "SiteBucket", {
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      encryption: BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const securityHeaders = new ResponseHeadersPolicy(this, "SecurityHeaders", {
      securityHeadersBehavior: {
        contentSecurityPolicy: { contentSecurityPolicy: CSP, override: true },
        contentTypeOptions: { override: true },
        frameOptions: { frameOption: HeadersFrameOption.DENY, override: true },
        referrerPolicy: { referrerPolicy: HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN, override: true },
        strictTransportSecurity: { accessControlMaxAge: Duration.days(365), includeSubdomains: true, override: true },
      },
    });

    const apiDomain = Fn.select(2, Fn.split("/", this.api.apiEndpoint));
    this.distribution = new Distribution(this, "Distribution", {
      defaultRootObject: "index.html",
      defaultBehavior: {
        origin: S3BucketOrigin.withOriginAccessControl(this.siteBucket),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        responseHeadersPolicy: securityHeaders,
        cachePolicy: CachePolicy.CACHING_OPTIMIZED,
      },
      additionalBehaviors: {
        "/graphql": {
          origin: new HttpOrigin(apiDomain),
          allowedMethods: AllowedMethods.ALLOW_ALL,
          viewerProtocolPolicy: ViewerProtocolPolicy.HTTPS_ONLY,
          cachePolicy: CachePolicy.CACHING_DISABLED,
          originRequestPolicy: OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER, // forwards query strings and headers; POST bodies are always forwarded
          responseHeadersPolicy: securityHeaders,
        },
      },
      // SPA fallback: unknown paths (a private S3 origin answers 403) serve index.html
      errorResponses: [
        { httpStatus: 403, responseHttpStatus: 200, responsePagePath: "/index.html", ttl: Duration.seconds(0) },
        { httpStatus: 404, responseHttpStatus: 200, responsePagePath: "/index.html", ttl: Duration.seconds(0) },
      ],
    });

    new BucketDeployment(this, "DeploySite", {
      sources: [Source.asset(props.webDistPath)],
      destinationBucket: this.siteBucket,
      distribution: this.distribution,
      distributionPaths: ["/*"],
    });

    new CfnOutput(this, "SiteUrl", { value: `https://${this.distribution.distributionDomainName}` });
    new CfnOutput(this, "ApiEndpoint", { value: this.api.apiEndpoint });
  }
}
