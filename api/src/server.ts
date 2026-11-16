import { createServer } from "node:http";
import type { IncomingMessage } from "node:http";
import { HeaderMap } from "@apollo/server";
import { createApp } from "./app.js";

const HOST = "127.0.0.1";
const PORT = Number(process.env["PORT"] ?? 4000);
const MAX_BODY_BYTES = 100_000;

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (c: Buffer) => {
      size += c.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("body too large"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });
    req.on("error", reject);
  });
}

const app = createApp();
await app.server.start();

const http = createServer((req, res) => {
  void (async () => {
    const url = new URL(req.url ?? "/", `http://${HOST}`);
    if (url.pathname === "/health" || (url.pathname === "/graphql" && req.method === "GET" && url.search === "")) {
      res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ status: "ok" }));
      return;
    }
    if (url.pathname !== "/graphql") {
      res.writeHead(404).end();
      return;
    }
    try {
      const body = req.method === "POST" ? await readBody(req) : "";
      const headers = new HeaderMap();
      for (const [k, v] of Object.entries(req.headers)) if (v !== undefined) headers.set(k, Array.isArray(v) ? v.join(", ") : v);
      const result = await app.server.executeHTTPGraphQLRequest({
        httpGraphQLRequest: { method: req.method ?? "POST", headers, search: url.search, body: body ? (JSON.parse(body) as unknown) : undefined },
        context: () => app.context(),
      });
      res.statusCode = result.status ?? 200;
      for (const [k, v] of result.headers) res.setHeader(k, v);
      if (result.body.kind === "complete") res.end(result.body.string);
      else res.end();
    } catch (e) {
      app.services.logger.error({ msg: "request failed", error: e instanceof Error ? e.message : "unknown" });
      res.writeHead(400, { "content-type": "application/json" }).end(JSON.stringify({ errors: [{ message: "Bad request", extensions: { code: "BAD_REQUEST" } }] }));
    }
  })();
});

http.listen(PORT, HOST, () => {
  app.services.logger.info({ msg: "listening", url: `http://${HOST}:${PORT}/graphql`, panelLoadMs: app.services.data.panel.loadMs });
});
