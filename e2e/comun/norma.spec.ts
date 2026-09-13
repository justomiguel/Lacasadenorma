import { expect, test } from "@playwright/test";

import { getContent } from "@/content/pack";

const { norma, ui } = getContent("es");

test.describe("capítulo Norma", () => {
  test("el libro se lee y se descarga desde el mismo PDF", async ({ page }) => {
    await page.goto("/norma");

    const leer = page.getByRole("link", { name: ui.normaPage.bookRead });
    const descargar = page.getByRole("link", { name: ui.normaPage.bookDownload });

    await expect(leer).toBeVisible();
    await expect(descargar).toBeVisible();
    await expect(leer).toHaveAttribute("href", norma.book.href);
    await expect(descargar).toHaveAttribute("href", norma.book.href);
    await expect(leer).toHaveAttribute("target", "_blank");
    await expect(descargar).toHaveAttribute("download", "norma-edith-bedoya.pdf");

    const archivo = await page.request.get(norma.book.href);

    expect(archivo.status()).toBe(200);
    expect(archivo.headers()["content-type"] ?? "").toMatch(/pdf/i);
  });

  test("los testimonios del documento están a la vista", async ({ page }) => {
    await page.goto("/norma");

    await expect(
      page.getByRole("heading", { name: ui.normaPage.quotesHeading }),
    ).toBeVisible();

    for (const entry of norma.quotes) {
      await expect(page.getByText(entry.quote, { exact: false })).toBeVisible();
      await expect(page.getByText(entry.author, { exact: true }).first()).toBeVisible();
    }
  });
});
