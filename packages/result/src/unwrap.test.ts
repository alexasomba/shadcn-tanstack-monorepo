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
  isReportableServerError,
  notFound,
  unauthorized,
  unwrapResult,
  unwrapResultWithCapture,
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

describe("isReportableServerError", () => {
  it("reports database and plain errors, not expected 4xx domain errors", () => {
    expect(isReportableServerError(new DatabaseError({ message: "db" }))).toBe(true);
    expect(isReportableServerError(new Error("boom"))).toBe(true);
    expect(isReportableServerError(notFound("Todo", 1))).toBe(false);
    expect(isReportableServerError(validation("bad"))).toBe(false);
    expect(isReportableServerError(unauthorized())).toBe(false);
    expect(isReportableServerError(conflict())).toBe(false);
  });
});

describe("unwrapResultWithCapture", () => {
  it("captures reportable errors before throw", () => {
    const seen: Array<Error> = [];
    expect(() =>
      unwrapResultWithCapture(Result.err(new DatabaseError({ message: "db" })), (e) => {
        seen.push(e);
      }),
    ).toThrow(DatabaseError);
    expect(seen).toHaveLength(1);
  });

  it("does not capture not-found before throw", () => {
    const seen: Array<Error> = [];
    expect(() =>
      unwrapResultWithCapture(Result.err(notFound("Todo", 1)), (e) => {
        seen.push(e);
      }),
    ).toThrow(NotFoundError);
    expect(seen).toHaveLength(0);
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
