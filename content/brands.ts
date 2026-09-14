/**
 * Marcas de terceros que aparecen en la interfaz.
 *
 * El archivo del logo vive en `public/marcas/`. El nombre va **al lado** del
 * mark, nunca reemplazado por él: un pictograma solo no dice "PayPal" a quien
 * no lo reconoce, y un lector de pantalla tiene que oír el nombre.
 *
 * El fill de cada SVG es `currentColor`: hereda la tinta de la superficie
 * (papel sobre bosque, tinta sobre papel) y no un azul de marca que desaparece
 * sobre el encabezado.
 *
 * `scripts/check-marcas.mjs` es la compuerta: cada id de acá tiene que tener
 * archivo y aparecer con `<BrandMark>` en la interfaz.
 */

export const BRANDS = {
  paypal: {
    name: "PayPal",
    src: "/marcas/paypal.svg",
    width: 24,
    height: 24,
  },
  mercadopago: {
    name: "Mercado Pago",
    src: "/marcas/mercadopago.svg",
    width: 24,
    height: 24,
  },
  brubank: {
    name: "Brubank",
    src: "/marcas/brubank.svg",
    width: 24,
    height: 24,
  },
  scotiabank: {
    name: "Scotiabank",
    src: "/marcas/scotiabank.svg",
    width: 24,
    height: 24,
  },
  instagram: {
    name: "Instagram",
    src: "/marcas/instagram.svg",
    width: 24,
    height: 24,
  },
  whatsapp: {
    name: "WhatsApp",
    src: "/marcas/whatsapp.svg",
    width: 24,
    height: 24,
  },
  facebook: {
    name: "Facebook",
    src: "/marcas/facebook.svg",
    width: 24,
    height: 24,
  },
  linkedin: {
    name: "LinkedIn",
    src: "/marcas/linkedin.svg",
    width: 24,
    height: 24,
  },
  x: {
    name: "X",
    src: "/marcas/x.svg",
    width: 24,
    height: 24,
  },
} as const;

export type BrandId = keyof typeof BRANDS;
