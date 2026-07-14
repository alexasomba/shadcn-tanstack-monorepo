import { createServerFn } from "@tanstack/react-start";
import { Result, unwrapResult } from "@workspace/result";

import { requireAuthMiddleware } from "./auth.middleware";
import { demoPortfolioData } from "./portfolio-demo-data";

/**
 * Authenticated portfolio payload for the user dashboard.
 * Demo data for now; swap for D1/data-service Result pipelines later.
 */
export const getPortfolio = createServerFn({ method: "GET" })
  .middleware([requireAuthMiddleware])
  .handler(async ({ context }) => {
    const result = Result.ok({
      ...demoPortfolioData,
      ownerUserId: context.user.id,
      ownerName: context.user.name,
    });
    return unwrapResult(result);
  });
