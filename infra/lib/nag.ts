import { Validations } from "aws-cdk-lib";
import type { Stack } from "aws-cdk-lib";

interface Ack {
  id: string;
  reason: string;
}

const IAM_HELPER = "CDK-generated helper role of the BucketDeployment / auto-delete custom resources";

/** Every acknowledgement (cdk-nag v3 `Validations.acknowledge`) carries the reason it is acceptable. */
export const ACKNOWLEDGEMENTS: Ack[] = [
  { id: "AwsSolutions-S1", reason: "No server access logs on the site bucket: it holds only the public static build (re-creatable from web/dist) and CloudFront is its only reader." },
  { id: "AwsSolutions-CFR1", reason: "No geo restriction: the app and the study data are public and global." },
  { id: "AwsSolutions-CFR2", reason: "No AWS WAF (cost, portfolio project): abuse is bounded by API Gateway throttling (20 requests/s, burst 40), query depth and complexity limits, and the 10 s Lambda timeout." },
  { id: "AwsSolutions-CFR3", reason: "CloudFront access logging is off to avoid a second log bucket and stored client IPs; the Lambda JSON logs show every GraphQL request (no bodies)." },
  { id: "AwsSolutions-CFR4", reason: "With the default *.cloudfront.net certificate CloudFront fixes the viewer security policy at TLSv1 and ignores a minimum protocol version; only a custom domain and certificate can raise it. Revisit when a custom domain is added." },
  { id: "AwsSolutions-APIG1", reason: "No API Gateway access log group: it would store client IPs; requests are visible in the Lambda JSON logs." },
  { id: "AwsSolutions-APIG4", reason: "The GraphQL endpoint is intentionally public and read-only (open data, no accounts); abuse is limited by throttling, depth/complexity limits and the Lambda timeout." },
  { id: "AwsSolutions-L1", reason: "The application function uses nodejs24.x, the newest GA Lambda Node.js runtime (Node.js 26 is in public preview only, with no SLA); the BucketDeployment helper function uses the runtime chosen by the CDK library version." },
  { id: "AwsSolutions-IAM4[Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole]", reason: "AWSLambdaBasicExecutionRole only allows writing CloudWatch Logs, the minimum a Lambda needs; the API function reads no AWS service (the panel is bundled), and the same policy is on the CDK helper function." },
  { id: "AwsSolutions-IAM5[Action::s3:Abort*]", reason: `${IAM_HELPER}: S3 multipart abort, scoped to the site bucket.` },
  { id: "AwsSolutions-IAM5[Action::s3:DeleteObject*]", reason: `${IAM_HELPER}: deleting the old site objects, scoped to the site bucket.` },
  { id: "AwsSolutions-IAM5[Action::s3:GetBucket*]", reason: `${IAM_HELPER}: read bucket metadata, scoped to the site bucket.` },
  { id: "AwsSolutions-IAM5[Action::s3:GetObject*]", reason: `${IAM_HELPER}: read objects, scoped to the site bucket and the CDK assets bucket.` },
  { id: "AwsSolutions-IAM5[Action::s3:List*]", reason: `${IAM_HELPER}: list the site bucket and the CDK assets bucket.` },
  { id: "AwsSolutions-IAM5[Resource::*]", reason: "CloudFront CreateInvalidation does not support resource-level permissions, so the BucketDeployment helper uses *; it can only invalidate caches." },
  { id: "AwsSolutions-IAM5[Resource::<SiteBucket397A1860.Arn>/*]", reason: `${IAM_HELPER}: object-level access under the site bucket only.` },
  { id: "AwsSolutions-IAM5[Resource::arn:<AWS::Partition>:s3:::cdk-hnb659fds-assets-<AWS::AccountId>-<AWS::Region>/*]", reason: "BucketDeployment must read the uploaded web build from the account's CDK bootstrap assets bucket (read-only)." },
];

export function addNagSuppressions(stack: Stack): void {
  for (const a of ACKNOWLEDGEMENTS) Validations.of(stack).acknowledge({ id: a.id, reason: a.reason });
}
