import { describe, expect, it } from "vitest";

import { generateInviteRejected, generateRecoveryRejected } from "./admin.mjs";

describe("generateInviteRejected", () => {
  it("invite sobre un correo ya confirmado es 422 email_exists", () => {
    expect(
      generateInviteRejected({ email_confirmed_at: "2026-09-20T00:00:00.000Z" }),
    ).toEqual({
      status: 422,
      error_code: "email_exists",
      msg: "A user with this email address has already been registered",
    });
  });

  it("sin confirmar no bloquea el invite", () => {
    expect(generateInviteRejected({ email_confirmed_at: null })).toBeNull();
  });

  it("sin usuario es 404", () => {
    expect(generateInviteRejected(null)).toEqual({
      status: 404,
      error_code: "user_not_found",
      msg: "User not found",
    });
  });
});

describe("generateRecoveryRejected", () => {
  it("recovery sobre un correo ya confirmado no se rechaza: es el camino de Volver a generar", () => {
    expect(
      generateRecoveryRejected({ email_confirmed_at: "2026-09-20T00:00:00.000Z" }),
    ).toBeNull();
  });

  it("sin usuario es 404", () => {
    expect(generateRecoveryRejected(null)).toEqual({
      status: 404,
      error_code: "user_not_found",
      msg: "User not found",
    });
  });
});
