import { describe, expect, it } from "vitest";

import { readChromeSession } from "./session";

describe("readChromeSession", () => {
  it("un JSON raro no deja el chrome en un estado a medias", () => {
    expect(readChromeSession(null)).toEqual({ status: "anonymous" });
    expect(readChromeSession({ status: "signed-in" })).toEqual({
      status: "signed-in",
      displayName: null,
      email: null,
      hasPortrait: false,
      staff: false,
      owner: false,
    });
  });

  it("staff y owner son verdaderos sólo si el snapshot los afirma", () => {
    expect(
      readChromeSession({
        status: "signed-in",
        displayName: "Editora",
        email: "editora@ejemplo.invalid",
        hasPortrait: true,
        staff: true,
      }),
    ).toEqual({
      status: "signed-in",
      displayName: "Editora",
      email: "editora@ejemplo.invalid",
      hasPortrait: true,
      staff: true,
      owner: false,
    });

    expect(
      readChromeSession({
        status: "signed-in",
        displayName: "Dueña",
        email: "duena@ejemplo.invalid",
        hasPortrait: false,
        staff: true,
        owner: true,
      }),
    ).toEqual({
      status: "signed-in",
      displayName: "Dueña",
      email: "duena@ejemplo.invalid",
      hasPortrait: false,
      staff: true,
      owner: true,
    });

    expect(
      readChromeSession({
        status: "signed-in",
        displayName: "Vecina",
        email: "vecina@ejemplo.invalid",
        hasPortrait: false,
        staff: false,
      }),
    ).toEqual({
      status: "signed-in",
      displayName: "Vecina",
      email: "vecina@ejemplo.invalid",
      hasPortrait: false,
      staff: false,
      owner: false,
    });
  });
});
