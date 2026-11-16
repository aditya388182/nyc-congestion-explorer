# BLOCKERS.md

Everything below needs **your** AWS account, credentials or money. Nothing else is blocked: all of Phases 0 to 8 are built and tested locally.
The build never ran `cdk deploy`, `cdk bootstrap`, `cdk destroy`, `make deploy` or `make smoke`, and never called AWS.

## Phase 9: deploy to AWS (do these in order)

Until step 7 is done the README and your resume must say "AWS CDK stack for Lambda, API Gateway, S3 and CloudFront", not "runs on Lambda" or "live".

### 1. Choose where the commands run
Either (a) attach an IAM role to this EC2 box, or (b) run on your laptop with your own credentials. Never paste access keys into the repo or into Claude.
- Option (a), in the AWS console: IAM → Roles → Create role → Trusted entity: AWS service → EC2 → attach a policy that lets CDK deploy (for a personal sandbox account: `AdministratorAccess`; for least privilege see the CDK bootstrap roles in step 3, which `cdk deploy` assumes, so the box role then only needs `sts:AssumeRole` on `arn:aws:iam::<ACCOUNT_ID>:role/cdk-hnb659fds-*`) → name it `congestion-explorer-deployer`. EC2 → Instances → select this instance → Actions → Security → Modify IAM role → pick that role → Update.
- Option (b): `aws configure sso` (or `aws configure`) on the laptop, then `git clone` or copy this repo there.

### 2. Check who you are and the region
```
aws sts get-caller-identity          # note the 12-digit Account
export AWS_REGION=us-east-1          # any region where Lambda Node.js 24 is available; us-east-1 is fine
```
(CloudFront is global; the stack is created in AWS_REGION.)

### 3. Bootstrap CDK once per account and region
```
cd infra
npx cdk bootstrap aws://<ACCOUNT_ID>/$AWS_REGION
```
Creates the `CDKToolkit` stack (an assets bucket and deploy roles). Cost: a few cents per month.

### 4. Make sure the memo PDF is in the build
`make memo` writes `reports/memo.pdf` and copies it to `web/public/memo.pdf` so the Data & Method page link works.

### 5. Deploy
```
make deploy        # builds web/dist, then runs `cdk deploy` (it shows an IAM/security diff: answer y)
```
Takes about 5 to 10 minutes (CloudFront). The outputs are `SiteUrl` (https://dXXXXXXXXXXXX.cloudfront.net) and `ApiEndpoint`.

### 6. Smoke-test the live site
```
make smoke URL=https://dXXXXXXXXXXXX.cloudfront.net
```
Writes `results/deploy_smoke.json` (20 estimate requests: status codes, p50/p95, first-request latency, URL, date, commit). Then open the URL in a browser and check: the map colours zones, Estimate re-runs when you change a control, Data & Method shows "Unexplained 0".
Expected first request: slower (Lambda cold start: loads the 1.6 MB panel once). If you get HTTP 403 from CloudFront on `/graphql`, check that the HTTP API route exists (`aws apigatewayv2 get-routes`).

### 7. Record it
- Put the live link at the top of `README.md`.
- `make bullets` then prints the "Deployed on AWS Lambda behind CloudFront" line (it needs `results/deploy_smoke.json`).
- Commit `results/deploy_smoke.json` and the README change.

### 8. Budget alarm (do this before leaving the stack running)
AWS console → Billing and Cost Management → Budgets → Create budget → Use a template → "Monthly cost budget" → budget amount **5 USD** → email recipients: your address → Create. Also: Billing → Billing preferences → tick "Receive Billing Alerts".
The stack's cost is dominated by nothing: API Gateway is throttled to 20 requests/s (burst 40), Lambda has a 10 s timeout, CloudFront and S3 serve a few MB.

### 9. Tear down (when you want to stop paying anything)
```
cd infra && npx cdk destroy
```
(The site bucket is configured to empty itself and delete.) The bootstrap stack `CDKToolkit` can stay.

## Skipped for lack of credentials
- `make deploy`, `make smoke`, the live link and the "runs on Lambda" resume line (Phase 9).
- The Lambda test event (`api/test/fixtures/apigw-v2-estimate.json`) follows AWS's documented HTTP API v2 format but was written by hand, not captured from a live API Gateway.
- The API latency in `results/api_latency.json` is local (this box), not Lambda; Lambda numbers come from step 6.
