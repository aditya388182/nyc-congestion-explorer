import { handlers, startServerAndCreateLambdaHandler } from "@as-integrations/aws-lambda";
import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2, Context as LambdaContext } from "aws-lambda";
import { createApp } from "./app.js";

/** Module scope: the panel is loaded once per cold start, then reused by every invocation. */
const t0 = performance.now();
const app = createApp();
const initMs = performance.now() - t0;
app.services.logger.info({ msg: "cold start", initMs, panelLoadMs: app.services.data.panel.loadMs });

const apollo = startServerAndCreateLambdaHandler(app.server, handlers.createAPIGatewayProxyEventV2RequestHandler(), {
  context: () => app.context(),
});

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

/** HTTP API v2 handler: `POST /graphql` runs GraphQL; a bare `GET /graphql` is the health check. */
export async function handler(
  event: APIGatewayProxyEventV2,
  context: LambdaContext,
): Promise<APIGatewayProxyStructuredResultV2> {
  if (event.requestContext.http.method === "GET" && event.rawQueryString === "") {
    return { statusCode: 200, headers: JSON_HEADERS, body: JSON.stringify({ status: "ok", panelSha256: app.services.data.panel.meta.sha256 }) };
  }
  const result = await apollo(event, context, () => undefined);
  if (!result) return { statusCode: 500, headers: JSON_HEADERS, body: JSON.stringify({ errors: [{ message: "Internal server error" }] }) };
  return result;
}

export { app as _appForTests };
