import { existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Match, Template } from "aws-cdk-lib/assertions";
import { CachePolicy, OriginRequestPolicy } from "aws-cdk-lib/aws-cloudfront";
import { beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../lib/app.js";
import { ACKNOWLEDGEMENTS } from "../lib/nag.js";
import { CSP } from "../lib/stack.js";

// AWS managed CloudFront policies, taken from the CDK constants rather than typed
const CACHING_DISABLED = CachePolicy.CACHING_DISABLED.cachePolicyId;
const ALL_VIEWER_EXCEPT_HOST_HEADER = OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER.originRequestPolicyId;

let template: Template;
const apiFunctions = (): { Properties: Record<string, unknown>; Metadata?: unknown }[] =>
  Object.entries(template.findResources("AWS::Lambda::Function")).filter(([id]) => id.startsWith("ApiFunction")).map(([, r]) => r as { Properties: Record<string, unknown>; Metadata?: unknown });
let assemblyDir: string;
let synthError: unknown;

beforeAll(() => {
  const web = mkdtempSync(join(tmpdir(), "web-dist-"));
  writeFileSync(join(web, "index.html"), "<!doctype html><title>test</title>");
  const out = mkdtempSync(join(tmpdir(), "cdk-out-"));
  const { app, stack } = createApp(web, out);
  try {
    const assembly = app.synth(); // runs cdk-nag (AwsSolutions): throws if any finding is not acknowledged
    assemblyDir = assembly.directory;
    template = Template.fromStack(stack);
  } catch (e) {
    synthError = e;
  }
});

describe("synth and cdk-nag", () => {
  it("synthesises with zero unacknowledged AwsSolutions findings", () => {
    expect(synthError, String(synthError)).toBeUndefined();
  });
  it("every acknowledgement has a written reason", () => {
    expect(ACKNOWLEDGEMENTS.length).toBeGreaterThan(0);
    for (const a of ACKNOWLEDGEMENTS) expect(a.reason.length, a.id).toBeGreaterThan(30);
  });
});

describe("API Lambda", () => {
  it("is Node.js 24 on arm64, 1024 MB, 10 s, with no reserved concurrency", () => {
    const fns = apiFunctions();
    expect(fns).toHaveLength(1);
    const fn = fns[0];
    expect(fn?.Properties).toMatchObject({ Runtime: "nodejs24.x", Architectures: ["arm64"], MemorySize: 1024, Timeout: 10 });
    expect(fn?.Properties).not.toHaveProperty("ReservedConcurrentExecutions");
  });
  it("keeps logs for 2 weeks", () => {
    template.hasResourceProperties("AWS::Logs::LogGroup", { RetentionInDays: 14 });
  });
  it("bundles the panel, the zone shapes, the results and the schema next to the handler", () => {
    // the Lambda code asset is the staged directory that contains the bundled handler
    const dirs = readdirSync(assemblyDir).filter((d) => d.startsWith("asset.") && existsSync(join(assemblyDir, d, "index.mjs")));
    expect(dirs).toHaveLength(1);
    const dir = join(assemblyDir, dirs[0] ?? "");
    for (const f of ["index.mjs", "schema.graphql", "data/panel.bin", "data/panel.meta.json", "data/zones.geojson", "data/results/headline.json"]) {
      expect(existsSync(join(dir, f)), f).toBe(true);
    }
    expect(readFileSync(join(dir, "schema.graphql"), "utf8")).toContain("type Query");
  });
});

describe("HTTP API", () => {
  it("has POST and GET /graphql routes only", () => {
    const routes = Object.values(template.findResources("AWS::ApiGatewayV2::Route")).map((r) => (r.Properties as { RouteKey: string }).RouteKey).sort();
    expect(routes).toEqual(["GET /graphql", "POST /graphql"]);
  });
  it("throttles the default stage at 20 requests/s with burst 40", () => {
    template.hasResourceProperties("AWS::ApiGatewayV2::Stage", {
      StageName: "$default",
      DefaultRouteSettings: { ThrottlingRateLimit: 20, ThrottlingBurstLimit: 40 },
    });
  });
});

describe("Site bucket and CloudFront", () => {
  it("blocks all public access and enforces TLS", () => {
    template.hasResourceProperties("AWS::S3::Bucket", {
      PublicAccessBlockConfiguration: { BlockPublicAcls: true, BlockPublicPolicy: true, IgnorePublicAcls: true, RestrictPublicBuckets: true },
    });
    template.hasResourceProperties("AWS::S3::BucketPolicy", {
      PolicyDocument: { Statement: Match.arrayWith([Match.objectLike({ Effect: "Deny", Action: "s3:*", Condition: { Bool: { "aws:SecureTransport": "false" } } })]) },
    });
  });
  it("reads the bucket through Origin Access Control (and only CloudFront may read it)", () => {
    template.hasResourceProperties("AWS::CloudFront::OriginAccessControl", {
      OriginAccessControlConfig: { OriginAccessControlOriginType: "s3", SigningBehavior: "always", SigningProtocol: "sigv4" },
    });
    const dist = Object.values(template.findResources("AWS::CloudFront::Distribution"))[0]?.Properties as { DistributionConfig: Record<string, unknown> };
    const origins = dist.DistributionConfig["Origins"] as { OriginAccessControlId?: unknown; S3OriginConfig?: unknown }[];
    expect(origins.some((o) => o.OriginAccessControlId !== undefined && o.S3OriginConfig !== undefined)).toBe(true);
  });
  it("routes /graphql to the HTTP API with caching disabled, all methods, HTTPS only, query strings and headers forwarded", () => {
    const dist = Object.values(template.findResources("AWS::CloudFront::Distribution"))[0]?.Properties as { DistributionConfig: { CacheBehaviors: Record<string, unknown>[]; DefaultCacheBehavior: Record<string, unknown> } };
    const [b] = dist.DistributionConfig.CacheBehaviors;
    expect(b).toMatchObject({
      PathPattern: "/graphql",
      CachePolicyId: CACHING_DISABLED,
      OriginRequestPolicyId: ALL_VIEWER_EXCEPT_HOST_HEADER,
      ViewerProtocolPolicy: "https-only",
    });
    expect(b?.["AllowedMethods"]).toEqual(expect.arrayContaining(["GET", "POST", "OPTIONS", "PUT", "PATCH", "DELETE", "HEAD"]));
    expect(dist.DistributionConfig.DefaultCacheBehavior["ViewerProtocolPolicy"]).toBe("redirect-to-https");
  });
  it("falls back to index.html for unknown paths (SPA) and sets a root object", () => {
    template.hasResourceProperties("AWS::CloudFront::Distribution", {
      DistributionConfig: {
        DefaultRootObject: "index.html",
        CustomErrorResponses: [
          { ErrorCode: 403, ResponseCode: 200, ResponsePagePath: "/index.html" },
          { ErrorCode: 404, ResponseCode: 200, ResponsePagePath: "/index.html" },
        ],
      },
    });
  });
  it("sends security headers including a CSP and HSTS", () => {
    template.hasResourceProperties("AWS::CloudFront::ResponseHeadersPolicy", {
      ResponseHeadersPolicyConfig: {
        SecurityHeadersConfig: {
          ContentSecurityPolicy: { ContentSecurityPolicy: CSP, Override: true },
          StrictTransportSecurity: { Override: true, IncludeSubdomains: true },
          FrameOptions: { FrameOption: "DENY" },
          ContentTypeOptions: { Override: true },
        },
      },
    });
  });
  it("deploys the web build and invalidates the cache", () => {
    template.hasResourceProperties("Custom::CDKBucketDeployment", { DistributionPaths: ["/*"] });
  });
});
