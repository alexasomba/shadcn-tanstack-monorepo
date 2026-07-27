import { DatabaseError, notFound, validation } from "@workspace/result";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const captureException = vi.fn();
const addBreadcrumb = vi.fn();

vi.mock("@sentry/cloudflare", () => ({
  captureException: (...args: Array<unknown>) => captureException(...args),
  addBreadcrumb: (...args: Array<unknown>) => addBreadcrumb(...args),
}));

// Import after mock registration (Vitest hoists vi.mock).
const { captureResultError } = await import("./lib/result-boundary");

describe("M18 result boundary", () => {
  beforeEach(() => {
    captureException.mockClear();
    addBreadcrumb.mockClear();
  });

  it("captures DatabaseError as Sentry issue with result_boundary tag", () => {
    captureResultError(new DatabaseError({ message: "query failed" }), {
      operation: "todos.list",
    });
    expect(captureException).toHaveBeenCalledOnce();
    const [, ctx] = captureException.mock.calls[0] as [Error, { tags?: Record<string, string> }];
    expect(ctx.tags?.result_boundary).toBe("true");
    expect(ctx.tags?.operation).toBe("todos.list");
    expect(ctx.tags?.error_code).toBe("DATABASE");
    expect(addBreadcrumb).not.toHaveBeenCalled();
  });

  it("breadcrumbs expected 4xx domain errors without Issues", () => {
    captureResultError(notFound("Todo", 1), { operation: "todos.read" });
    expect(captureException).not.toHaveBeenCalled();
    expect(addBreadcrumb).toHaveBeenCalledOnce();

    captureResultError(validation("title required", "title"), { operation: "todos.create" });
    expect(captureException).not.toHaveBeenCalled();
    expect(addBreadcrumb).toHaveBeenCalledTimes(2);
  });
});
