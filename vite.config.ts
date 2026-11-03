// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import type { Plugin } from "vite";

/**
 * Dev-only plugin: handle OWLY API routes in Vite middleware.
 * In production, Nitro/TanStack Start handles createAPIFileRoute automatically.
 * In dev mode, we intercept /api/auth/* before the SSR handler.
 */
function owlyApiDevPlugin(): Plugin {
  return {
    name: "owly-api-dev",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? "";
        // Only intercept /api/auth/* POST requests
        if (!url.startsWith("/api/auth/") || req.method !== "POST") {
          return next();
        }

        try {
          // Dynamically import the auth server functions (runs in Node, not browser)
          const { registerHandler, loginHandler } = await import(
            "./src/server-functions/auth.ts"
          ) as { registerHandler: (body: unknown) => Promise<{ ok: boolean; [k: string]: unknown }>, loginHandler: (body: unknown) => Promise<{ ok: boolean; [k: string]: unknown }> };

          // Read body
          const chunks: Buffer[] = [];
          await new Promise<void>((resolve, reject) => {
            req.on("data", (chunk: Buffer) => chunks.push(chunk));
            req.on("end", resolve);
            req.on("error", reject);
          });
          const body = JSON.parse(
            Buffer.concat(chunks).toString("utf8") || "{}",
          ) as unknown;

          let result: { ok: boolean; [k: string]: unknown };
          let status: number;

          if (url === "/api/auth/register") {
            result = await registerHandler(body);
            status = result.ok ? 201 : 400;
          } else if (url === "/api/auth/login") {
            result = await loginHandler(body);
            status = result.ok ? 200 : 401;
          } else if (url === "/api/auth/logout") {
            result = { ok: true };
            status = 200;
          } else {
            return next();
          }

          res.writeHead(status, { "Content-Type": "application/json" });
          res.end(JSON.stringify(result));
        } catch (err) {
          console.error("[DEBUG][owly-api-dev] error:", err);
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: false, error: "Erreur serveur interne" }));
        }
      });
    },
  };
}

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  plugins: [owlyApiDevPlugin()],
});
