import { join } from "node:path";
import { App, Validations } from "aws-cdk-lib";
import { AwsSolutionsChecks } from "cdk-nag";
import { addNagSuppressions } from "./nag.js";
import { CongestionStack } from "./stack.js";

/** The app used by `cdk synth` and by the tests: stack + acknowledgements + the AwsSolutions rule pack. */
export function createApp(webDistPath: string, outdir?: string): { app: App; stack: CongestionStack } {
  const repoRoot = join(__dirname, "..", "..");
  const app = new App(outdir ? { outdir } : {});
  // no `env`: environment-agnostic, so `cdk synth` needs no AWS account or credentials
  const stack = new CongestionStack(app, "CongestionExplorer", { repoRoot, webDistPath });
  addNagSuppressions(stack);
  Validations.of(app).addPlugins(new AwsSolutionsChecks(app, { verbose: true }));
  return { app, stack };
}
