#!/usr/bin/env node
/**
 * Capturas para el loop de revisión visual.
 *
 * El principio VIII de la constitución —que la interfaz no parezca un template
 * generado— no se puede verificar leyendo código. Este script produce la evidencia
 * sobre la que se decide: cada página en 360 px, que es el ancho real de quien llega
 * de un WhatsApp, y en 1440 px.
 *
 * Las capturas van a `.local/screenshots/`, que está fuera del repositorio: son
 * material de trabajo, no artefactos versionados.
 *
 * Uso: node scripts/screenshots.mjs [ruta…]
 */

import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";

const BASE = process.env.SCREENSHOT_BASE_URL ?? "http://localhost:3000";
const OUT = ".local/screenshots";

const DEFAULT_ROUTES = [
  "/",
  "/norma",
  "/que-paso",
  "/reconstruccion",
  "/ayudar",
  "/transparencia",
  "/novedades",
  "/legado",
  "/legales/privacidad",
  "/legales/terminos",
];

const VIEWPORTS = [
  { name: "mobile", width: 360, height: 780 },
  { name: "desktop", width: 1440, height: 900 },
];

/**
 * El indicador de desarrollo de Next se dibuja encima de la barra de ayuda y tapa
 * justo lo que hay que revisar. No se desactiva en `next.config`, porque a una
 * persona desarrollando le sirve: se oculta sólo en la captura.
 */
const HIDE_DEV_OVERLAY = "nextjs-portal { display: none !important; }";

const routes = process.argv.slice(2).length > 0 ? process.argv.slice(2) : DEFAULT_ROUTES;

function fileNameFor(route, viewport) {
  const slug = route === "/" ? "home" : route.replace(/^\//, "").replaceAll("/", "-");

  return `${OUT}/${slug}--${viewport}.png`;
}

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();

for (const viewport of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 2,
    locale: "es-AR",
  });

  for (const route of routes) {
    const page = await context.newPage();
    const response = await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });

    if (response !== null && !response.ok()) {
      console.error(`✗ ${route} devolvió ${String(response.status())}`);
    }

    await page.addStyleTag({ content: HIDE_DEV_OVERLAY });

    // La primera pantalla se captura aparte: es lo que decide SC-001, y en una
    // captura de página completa el pliegue no se ve.
    await page.screenshot({ path: fileNameFor(route, `${viewport.name}-fold`) });

    await page.screenshot({ path: fileNameFor(route, viewport.name), fullPage: true });
    console.error(`✓ ${route} (${viewport.name})`);

    await page.close();
  }

  await context.close();
}

await browser.close();
