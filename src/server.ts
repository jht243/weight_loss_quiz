import { createServer, IncomingMessage, ServerResponse } from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = path.resolve(__dirname, "..", "assets");
const PORT = Number(process.env.PORT ?? 8000);

const RESOURCE_MIME_TYPE = "text/html;profile=mcp-app";
const DOMAIN = "https://trip-planner-da2g.onrender.com";

// Metadata shared between tool and resource
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

// Define tools and resources manually to ensure _meta is included
const tools = [{
  name: "test-connection",
  description: "Test the MCP connection and load the widget.",
  inputSchema: {
    type: "object",
    properties: {
      variant: { type: "string", enum: ["test", "main"], description: "Which widget variant to load" }
    }
  },
  _meta: widgetMeta
}];

const resources = [{
  uri: "ui://widget/test",
  name: "test-widget",
  mimeType: RESOURCE_MIME_TYPE,
  _meta: widgetMeta
}];

// Store active SSE sessions
const sessions = new Map();

const ssePath = "/mcp/sse";
const postPath = "/mcp/messages";

function createMcpServer() {
  const server = new Server(
    { name: "trip-planner-mcp-node", version: "0.1.0" },
    { capabilities: { resources: {}, tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools
  }));

  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: resources
  }));

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri = request.params.uri;
    if (uri !== "ui://widget/test") throw new Error("Resource not found");

    let html = "<h1>Test Widget</h1><p>Assets not found.</p>";
    try {
      const params = new URLSearchParams(uri.split('?')[1]);
      const variant = params.get('variant') || 'test';
      const filename = variant === 'main' ? 'trip-planner.html' : 'trip-planner-test.html';
      html = fs.readFileSync(path.join(ASSETS_DIR, filename), "utf8");
    } catch (e) {
      console.error("Failed to read asset:", e);
    }
    return {
      contents: [{
        uri: uri,
        mimeType: RESOURCE_MIME_TYPE,
        text: html,
        _meta: widgetMeta,
      }]
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name !== "test-connection") throw new Error("Tool not found");

    const args = request.params.arguments as any;
    const variant = args?.variant || "test";
    const targetUri = variant === 'main' ? "ui://widget/test?variant=main" : "ui://widget/test?variant=test";

    return {
      content: [{ type: "text", text: "Connection successful. Loading widget..." }],
      _meta: {
        ...widgetMeta,
        ui: { ...widgetMeta.ui, resourceUri: targetUri }
      }
    };
  });

  return server;
}

async function handleSseRequest(res: ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const server = createMcpServer();
  const transport = new SSEServerTransport(postPath, res);
  // @ts-ignore - access private/protected property if needed or rely on sdk behavior
  const sessionId = transport.sessionId;

  sessions.set(sessionId, { server, transport });

  transport.onclose = async () => {
    sessions.delete(sessionId);
    await server.close();
  };

  await server.connect(transport);
}

async function handlePostMessage(req: IncomingMessage, res: ServerResponse, url: URL) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const sessionId = url.searchParams.get("sessionId");

  if (!sessionId) {
    res.writeHead(400).end("Missing sessionId");
    return;
  }

  const session = sessions.get(sessionId);
  if (!session) {
    res.writeHead(404).end("Session not found");
    return;
  }

  await session.transport.handlePostMessage(req, res);
}

const httpServer = createServer(async (req, res) => {
  if (!req.url) { res.writeHead(400).end("Missing URL"); return; }
  const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);

  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204).end();
    return;
  }

  // SSE Endpoint
  if (req.method === "GET" && url.pathname === ssePath) {
    await handleSseRequest(res);
    return;
  }

  // POST Endpoint
  if (req.method === "POST" && url.pathname === postPath) {
    await handlePostMessage(req, res, url);
    return;
  }

  // Static Assets
  if (req.method === "GET" && url.pathname.startsWith("/assets/")) {
    const assetPath = path.join(ASSETS_DIR, url.pathname.replace("/assets/", ""));
    if (!assetPath.startsWith(ASSETS_DIR)) {
      res.writeHead(403).end("Forbidden");
      return;
    }
    if (fs.existsSync(assetPath) && fs.statSync(assetPath).isFile()) {
      res.writeHead(200);
      fs.createReadStream(assetPath).pipe(res);
      return;
    }
  }

  if (req.method === "GET" && url.pathname === "/health") {
    res.writeHead(200).end("OK");
    return;
  }

  res.writeHead(404).end("Not Found");
});

httpServer.listen(PORT, () => {
  console.log(`MCP server (SDK 0.5.0) running on http://localhost:${PORT}`);
  console.log(`SSE endpoint: http://localhost:${PORT}${ssePath}`);
});
