import { describe, expect, it } from "vitest";

import { QueryError } from "./query";

describe("QueryError", () => {
  it("nombra la operación y el 401 de PostgREST", () => {
    const error = new QueryError("registrar el envío", {
      message: "JWT expired",
      code: "PGRST301",
      status: 401,
      hint: "refresh the token",
    });

    expect(error.name).toBe("QueryError");
    expect(error.message).toBe("registrar el envío: JWT expired (PGRST301) [401]");
    expect(error.status).toBe(401);
    expect(error.code).toBe("PGRST301");
    expect(error.hint).toBe("refresh the token");
  });
});
