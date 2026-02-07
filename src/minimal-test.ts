import { createServer } from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = path.resolve(__dirname, "..", "assets");
const port = Number(process.env.PORT ?? 8000);

const RESOURCE_MIME_TYPE = "text/html;profile=mcp-app";
const DOMAIN = "https://trip-planner-da2g.onrender.com";

const httpServer = createServer(async (req, res) => {
  if (!req.url) { res.writeHead(400).end("Missing URL"); return; }

  const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);

  // CORS headers for all responses
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type, mcp-session-id");
  res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");

  if (req.method === "OPTIONS") {
    res.writeHead(204).end();
    return;
  }

  // MCP Endpoint
  const MCP_METHODS = new Set(["POST", "GET"]);
  if (url.pathname === "/mcp" && req.method && MCP_METHODS.has(req.method)) {
    const server = new McpServer({
      name: "trip-planner-test",
      version: "0.1.0"
    }, {
      capabilities: {
        resources: {},
        tools: {},
      }
    });

    // Define the widget metadata
    const widgetMeta = {
      ui: {
        resourceUri: "ui://widget/test",
        prefersBorder: true,
        domain: DOMAIN,
        csp: {
          connectDomains: [DOMAIN],
          resourceDomains: [DOMAIN],
        },
      },
      "openai/widgetDescription": "A test widget to verify MCP connection.",
      "openai/widgetAccessible": true,
      "openai/resultCanProduceWidget": true,
    } as const;

    // Register the resource (the HTML widget)
    server.resource(
      "test-widget",
      "ui://widget/test",
      { mimeType: RESOURCE_MIME_TYPE, _meta: widgetMeta },
      async (uri) => {
        let html = "<h1>Test Widget</h1><p>Assets not found.</p>";
        try {
          const params = new URLSearchParams(uri.href.split('?')[1]);
          const variant = params.get('variant') || 'test';
          const filename = variant === 'main' ? 'trip-planner.html' : 'trip-planner-test.html';
          html = fs.readFileSync(path.join(ASSETS_DIR, filename), "utf8");
        } catch (e) {
          console.error("Failed to read asset:", e);
        }
        return {
          contents: [{
            uri: uri.href,
            mimeType: RESOURCE_MIME_TYPE,
            text: html,
            _meta: widgetMeta,
          }]
        };
      }
    );

    // Register the tool (to invoke the widget)
    server.tool(
      "test-connection",
      "Test the MCP connection and load the widget.",
      {
        variant: z.enum(["test", "main"]).optional().describe("Which widget variant to load"),
      },
      async ({ variant }) => {
        const targetUri = variant === 'main' ? "ui://widget/test?variant=main" : "ui://widget/test?variant=test";
        return {
          content: [{ type: "text", text: "Connection successful. Loading widget..." }],
          _meta: {
            ...widgetMeta,
            ui: { ...widgetMeta.ui, resourceUri: targetUri }
          }
        };
      }
    );

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    res.on("close", () => { transport.close(); server.close(); });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res);
    } catch (error) {
      console.error("MCP error:", error);
      if (!res.headersSent) res.writeHead(500).end("Internal server error");
    }
    return;
  }

  // Static Assets Handler (for scripts/styles loaded by the widget)
  if (req.method === "GET" && url.pathname.startsWith("/assets/")) {
    const assetPath = path.join(ASSETS_DIR, url.pathname.replace("/assets/", ""));

    // Security check: unexpected path traversal
    if (!assetPath.startsWith(ASSETS_DIR)) {
      res.writeHead(403).end("Forbidden");
      return;
    }

    try {
      if (fs.existsSync(assetPath) && fs.statSync(assetPath).isFile()) {
        const ext = path.extname(assetPath);
        const mime = ext === ".html" ? "text/html" :
          ext === ".js" ? "application/javascript" :
            ext === ".css" ? "text/css" : "text/plain";

        res.writeHead(200, { "content-type": mime });
        fs.createReadStream(assetPath).pipe(res);
        return;
      }
    } catch (e) {
      console.error(`Asset error: ${e}`);
    }

    res.writeHead(404).end("Not Found");
    return;
  }

  if (req.method === "GET" && url.pathname === "/health") {
    res.writeHead(200, { "content-type": "text/plain" }).end("OK");
    return;
  }

  res.writeHead(404).end("Not Found");
});

httpServer.listen(port, () => {
  console.log(`Minimal MCP test server running on http://localhost:${port}/mcp`);
  console.log(`Serving assets from ${ASSETS_DIR}`);
});
