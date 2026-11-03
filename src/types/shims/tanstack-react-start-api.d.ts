/**
 * Type stub for @tanstack/react-start/api
 * createAPIFileRoute is handled at runtime by the Vite owlyApiDevPlugin middleware (dev)
 * and by Nitro server routes (prod). This stub satisfies TypeScript only.
 * DEBUG MODE ACTIVE — CERTIFIED_100=false
 */
declare module "@tanstack/react-start/api" {
  type RouteHandler = (ctx: { request: Request }) => Response | Promise<Response>;

  interface APIRouteHandlers {
    GET?: RouteHandler;
    POST?: RouteHandler;
    PUT?: RouteHandler;
    PATCH?: RouteHandler;
    DELETE?: RouteHandler;
    OPTIONS?: RouteHandler;
    HEAD?: RouteHandler;
  }

  export function createAPIFileRoute(
    path: string,
  ): (handlers: APIRouteHandlers) => APIRouteHandlers;
}
