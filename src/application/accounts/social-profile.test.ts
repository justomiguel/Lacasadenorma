import { beforeEach, describe, expect, it } from "vitest";

import { FakeAccountPort, fakeProfile, silentLogger } from "./fake-account-port";
import { applySocialProfileHints } from "./social-profile";

describe("applySocialProfileHints", () => {
  let port: FakeAccountPort;

  beforeEach(() => {
    port = new FakeAccountPort();
    port.profile = fakeProfile();
  });

  it("copia nombre y foto cuando el perfil está vacío", async () => {
    port.socialHints = {
      displayName: "Juan Pérez",
      avatarUrl: "https://lh3.googleusercontent.com/a/foto",
    };

    await applySocialProfileHints(port, silentLogger);

    expect(port.profile?.displayName).toBe("Juan Pérez");
    expect(port.profile?.defaultAnonymous).toBe(true);
    expect(port.importedPortraitFrom).toBe("https://lh3.googleusercontent.com/a/foto");
    expect(port.profile?.portraitPath).not.toBeNull();
  });

  it("no pisa un nombre o una foto que la persona ya eligió", async () => {
    port.profile = fakeProfile({
      displayName: "Vecina de la cuadra",
      portraitPath: "00000000-0000-4000-8000-000000000001/retrato.jpg",
    });
    port.socialHints = {
      displayName: "Juan Pérez",
      avatarUrl: "https://lh3.googleusercontent.com/a/foto",
    };

    await applySocialProfileHints(port, silentLogger);

    expect(port.profile?.displayName).toBe("Vecina de la cuadra");
    expect(port.importedPortraitFrom).toBeNull();
  });

  it("sin identidad social no escribe nada", async () => {
    port.socialHints = null;

    await applySocialProfileHints(port, silentLogger);

    expect(port.profile?.displayName).toBeNull();
    expect(port.importedPortraitFrom).toBeNull();
  });

  it("si la foto no se puede bajar, el nombre igual queda", async () => {
    port.failPortraitImport = true;
    port.socialHints = {
      displayName: "Juan Pérez",
      avatarUrl: "https://lh3.googleusercontent.com/a/foto",
    };

    await applySocialProfileHints(port, silentLogger);

    expect(port.profile?.displayName).toBe("Juan Pérez");
    expect(port.importedPortraitFrom).toBeNull();
    expect(port.profile?.portraitPath).toBeNull();
  });
});
