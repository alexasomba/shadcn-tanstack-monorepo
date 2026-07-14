import { describe, expect, it } from "vite-plus/test";

import {
  DatabaseError,
  NotFoundError,
  Result,
  ValidationError,
  appErrorBody,
  appErrorCode,
  appErrorStatus,
  conflict,
  notFound,
  unauthorized,
  unwrapResult,
  validation,
} from "./index";

describe("unwrapResult", () => {
  it("returns ok values", () => {
    expect(unwrapResult(Result.ok(42))).toBe(42);
  });

  it("throws err values", () => {
    expect(() => unwrapResult(Result.err(notFound("Todo", 1)))).toThrow(NotFoundError);
  });
});

describe("appErrorStatus", () => {
  it("maps tagged errors", () => {
    expect(appErrorStatus(unauthorized())).toBe(401);
    expect(appErrorStatus(notFound("Todo"))).toBe(404);
    expect(appErrorStatus(validation("bad", "title"))).toBe(400);
    expect(appErrorStatus(conflict())).toBe(409);
    expect(appErrorStatus(new DatabaseError({ message: "fail" }))).toBe(500);
    expect(appErrorStatus(new Error("plain"))).toBe(500);
  });
});

describe("appErrorCode", () => {
  it("maps tagged errors to stable codes", () => {
    expect(appErrorCode(unauthorized())).toBe("UNAUTHORIZED");
    expect(appErrorCode(notFound("Todo", 9))).toBe("NOT_FOUND");
    expect(appErrorCode(validation("required"))).toBe("VALIDATION");
    expect(appErrorCode(conflict())).toBe("CONFLICT");
    expect(appErrorCode(new DatabaseError({ message: "db" }))).toBe("DATABASE");
  });
});

describe("appErrorBody", () => {
  it("shapes API error JSON", () => {
    const body = appErrorBody(notFound("Todo", 3));
    expect(body).toEqual({
      success: false,
      error: {
        code: "NOT_FOUND",
        message: "Todo '3' not found",
      },
    });
  });
});

describe("domain factories", () => {
  it("builds NotFoundError with resource/id", () => {
    const err = notFound("Todo", 1);
    expect(NotFoundError.is(err)).toBe(true);
    expect(err.resource).toBe("Todo");
    expect(err.id).toBe(1);
  });

  it("builds ValidationError with field", () => {
    const err = validation("Title is required", "title");
    expect(ValidationError.is(err)).toBe(true);
    expect(err.field).toBe("title");
  });
});
