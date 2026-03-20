import { betterAuth } from "better-auth";
import { Pool } from "pg";
import { createServer } from "node:http";

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    "postgres://postgres:postgres@localhost:5432/konbini_navi",
});

export const auth = betterAuth({
  database: pool,
  emailAndPassword: {
    enabled: true,
  },
  trustedOrigins: ["http://localhost:8081", "http://localhost:19006"],
});

const server = createServer(async (req, res) => {
  // Health check
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }

  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  res.setHeader("Access-Control-Max-Age", "300");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // Convert Node.js request to Web Request for better-auth
  const protocol = "http";
  const host = req.headers.host ?? "localhost:4000";
  const url = new URL(req.url ?? "/", `${protocol}://${host}`);

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value) {
      headers.set(key, Array.isArray(value) ? value.join(", ") : value);
    }
  }

  const body = await new Promise<string>((resolve) => {
    let data = "";
    req.on("data", (chunk: Buffer) => {
      data += chunk.toString();
    });
    req.on("end", () => resolve(data));
  });

  const webRequest = new Request(url.toString(), {
    method: req.method ?? "GET",
    headers,
    ...(body && req.method !== "GET" && req.method !== "HEAD"
      ? { body }
      : {}),
  });

  const response = await auth.handler(webRequest);

  // Convert Web Response back to Node.js response
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });
  res.writeHead(response.status);
  const responseBody = await response.text();
  res.end(responseBody);
});

const PORT = parseInt(process.env.PORT ?? "4000", 10);
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Auth service listening on :${PORT}`);
});
