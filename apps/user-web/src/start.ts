import { createMiddleware, createStart } from "@tanstack/react-start";

/**
 * Global Start middleware (start-core/middleware).
 * Request logging only — do NOT put require-auth here; public RPCs (getSession) must stay open.
 */
const requestLogger = createMiddleware().server(async ({ next, request }) => {
  const started = Date.now();
  try {
    return await next();
  } finally {
    const ms = Date.now() - started;
    console.info(`[user-web] ${request.method} ${new URL(request.url).pathname} ${ms}ms`);
  }
});

export const startInstance = createStart(() => ({
  requestMiddleware: [requestLogger],
}));
