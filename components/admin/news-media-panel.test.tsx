import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { NewsMediaInsertProvider } from "./news-media-context";
import { MediaKindTabs } from "./news-media-kind";
import { NewsMediaPanel } from "./news-media-panel";

describe("MediaKindTabs", () => {
  it("pone el pictograma antes del nombre", () => {
    const { container } = render(
      <MediaKindTabs kind="photo" baseId="medios" onChange={() => undefined} />,
    );

    const foto = container.querySelector("[data-media-mark=photo]");
    const video = container.querySelector("[data-media-mark=video]");

    expect(foto).not.toBeNull();
    expect(foto?.className).toMatch(/identifying-mark/);
    expect(foto?.nextSibling?.textContent).toBe("Foto");
    expect(video?.nextSibling?.textContent).toBe("Video");
  });
});

describe("NewsMediaPanel", () => {
  it("muestra el archivo y qué se ve sin tener que tocar un botón de formato", () => {
    render(
      <NewsMediaInsertProvider>
        <NewsMediaPanel
          updateId="11111111-1111-4111-8111-111111111111"
          slug="obra"
          media={[]}
          upload={vi.fn()}
        />
      </NewsMediaInsertProvider>,
    );

    expect(screen.getByRole("tab", { name: /^foto$/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByLabelText(/^archivo$/i)).toBeVisible();
    expect(screen.getByLabelText(/^qué se ve$/i)).toBeVisible();
    expect(screen.getByRole("button", { name: /adjuntar foto/i })).toBeVisible();
    expect(screen.getByText(/todavía no tiene foto ni video/i)).toBeVisible();
  });

  it("al elegir video, el formulario pide un video", async () => {
    const user = userEvent.setup();

    render(
      <NewsMediaInsertProvider>
        <NewsMediaPanel
          updateId="11111111-1111-4111-8111-111111111111"
          slug="obra"
          media={[]}
          upload={vi.fn()}
        />
      </NewsMediaInsertProvider>,
    );

    await user.click(screen.getByRole("tab", { name: /^video$/i }));

    expect(screen.getByRole("tab", { name: /^video$/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByLabelText(/^archivo$/i)).toHaveAttribute(
      "accept",
      "video/mp4,video/webm",
    );
    expect(screen.getByRole("button", { name: /adjuntar video/i })).toBeVisible();
  });
});
