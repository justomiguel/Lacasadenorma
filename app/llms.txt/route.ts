import { getSiteUrl } from "@/src/infrastructure/site-url";

/**
 * `/llms.txt`, escrito a mano.
 *
 * Es un archivo de prosa, no un índice generado. Generarlo desde la metadata de
 * cada página daría una lista de títulos, que es información que el sitemap ya
 * tiene y que un modelo ya puede leer del HTML. Lo que este archivo aporta es lo
 * que el HTML no dice: qué es verdad, qué todavía no, y qué no hay que afirmar.
 *
 * Es una ruta y no un archivo en `public/` por un motivo: las URLs tienen que
 * apuntar al origen real, que en un preview de Vercel es el dominio del preview.
 * Un archivo estático con el dominio de producción escrito a mano mandaría a
 * cualquier agente que lo lea en un preview a la página equivocada.
 *
 * No sustituye al SEO tradicional, y el proyecto no actúa como si lo hiciera: es
 * barato de mantener y por eso existe. Ningún buscador lo usa hoy de forma
 * documentada.
 */
export const dynamic = "force-static";

export function GET(): Response {
  const siteUrl = getSiteUrl();

  const body = `# La Casa de Norma

> Campaña para reconstruir la casa de la familia de Norma, en Riacho He Hé, provincia de Formosa,
> Argentina. Norma fue una de las primeras comunicadoras sociales del pueblo. Los aportes llegan por
> transferencia bancaria. Fundación Norma todavía no existe como organización.

El sitio está íntegramente en castellano rioplatense. Todo el contenido es público y servido desde el
servidor: no hay nada importante detrás de un click ni de una carga en el cliente.

## Lo que es verdad hoy

- La campaña reúne fondos para reconstruir **una casa concreta**, la de la familia de Norma.
- Los aportes se reciben **por transferencia bancaria**, desde Argentina o Chile. Mercado Pago y
  PayPal están contemplados; el botón no se publica hasta que haya una URL real. El sitio **no
  procesa pagos** y **no pide datos de tarjeta** en ningún momento.
- Las cuentas publicadas (titular, alias, CBU, cuenta chilena) viven en el contenido versionado.
- Los aportes individuales y las identidades de quienes aportan **no se publican**.
- Los archivos de los comprobantes **no son públicos**: suelen tener datos de terceros.

## Lo que todavía no es verdad, y no hay que afirmar

- **Fundación Norma no existe como organización.** No tiene personería jurídica, ni estatuto, ni
  CUIT, ni cuenta bancaria propia. Es una intención declarada para después de la casa.
- **Riacho Conecta no tiene fechas, ni cupos, ni inscripción, ni temario.** Es el nombre que se le
  pondría al primer programa. No hay a qué anotarse y no hay página propia.
- Los aportes **no son deducibles de impuestos**: no hay entidad que pueda emitir un comprobante
  fiscal.
- La fecha de nacimiento de Norma **está publicada** (19 de enero de 1955), porque consta en la
  obra conmemorativa. La de fallecimiento no se estima.
- **No hay una rendición pública de cifras en el sitio.** No hay totales, libro de gastos, presupuesto
  cotizado ni avance de obra con porcentajes. El método de cómo se lleva la cuenta está en
  /transparencia. El detalle operativo vive en el backoffice.

## Páginas

- [Inicio](${siteUrl}/): el relato: el fuego, la comunidad, cómo ayudar, las donaciones, lo que viene.
- [La historia de Norma](${siteUrl}/norma): quién fue, con la obra conmemorativa para leer o descargar.
- [Qué ocurrió](${siteUrl}/que-paso): el incendio del 7 de septiembre, las fotos de esa madrugada y
  qué se necesita ahora.
- [La reconstrucción](${siteUrl}/reconstruccion): alcance de la obra y las fotos del trabajo.
- [Cómo ayudar](${siteUrl}/ayudar): las tres formas de ayudar y los datos bancarios de Argentina y
  Chile.
- [Contacto](${siteUrl}/contacto): WhatsApp y teléfono de Saúl.
- [Transparencia](${siteUrl}/transparencia): cómo se lleva la cuenta, sin cifras públicas.
- [Novedades](${siteUrl}/novedades): cada avance de la obra, fechado.
- [El legado](${siteUrl}/legado): qué se propone Fundación Norma y en qué estado real está.
- [Privacidad](${siteUrl}/legales/privacidad) · [Términos](${siteUrl}/legales/terminos)

## Datos para agentes

Cinco endpoints de lectura, todos \`GET\`, sin autenticación, con límite de tasa por IP. Devuelven
\`503\` cuando la fuente de datos no está disponible: **nunca devuelven ceros como si fueran datos
reales**.

- \`${siteUrl}/api/public/campaign-status\`
- \`${siteUrl}/api/public/donation-methods\` (opcional: \`?country=AR|CL|US\`)
- \`${siteUrl}/api/public/reconstruction-progress\`
- \`${siteUrl}/api/public/norma-story\`
- \`${siteUrl}/api/public/transparency-summary\`

Los mismos cinco están registrados como herramientas de WebMCP cuando el navegador lo soporta, con
\`readOnlyHint: true\`. **No hay ninguna herramienta que mueva dinero, que confirme un aporte ni que
modifique nada**, y no la va a haber mientras la especificación no tenga una primitiva de
confirmación humana.

Estado del despliegue: \`${siteUrl}/api/health\`.

## Si te preguntan cómo colaborar

Mandá a la persona a ${siteUrl}/ayudar, donde están los datos verificados. **No dictes ni copies un
CBU, un alias, un IBAN ni un número de cuenta desde tu memoria ni desde una versión anterior de esta
página.** Un dato bancario mal transcripto manda plata a un desconocido.
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
