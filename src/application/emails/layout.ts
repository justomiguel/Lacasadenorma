/**
 * La plantilla HTML de los correos del producto (ADR-028 enmienda).
 *
 * Una tabla de 600 px, `role="presentation"`, y nada más. Los clientes de correo
 * sin ella colapsan el diseño; anidar tablas de marketing o usarlas para el
 * cuerpo sigue prohibido. Sin imágenes remotas, sin fuentes de la red, sin pixel
 * de seguimiento: Georgia y Arial, que ya están en el aparato.
 *
 * Los colores son los del sitio (ADR-025). El primer correo que recibe una
 * desconocida tiene que verse como de este dominio, no como de un proveedor.
 */

const PAPER = "#F6F1E8";
const FOREST = "#153A2E";
const SAGE = "#C5CDB0";
const INK = "#1C1C1C";
const MUTED = "#5C5F56";
const OLIVE = "#3F4A32";

export const EMAIL_FOREST = FOREST;
export const EMAIL_PAPER = PAPER;

export interface EmailDocument {
  readonly lang: "es" | "en";
  readonly siteName: string;
  readonly preheader: string;
  readonly heading: string;
  readonly paragraphs: readonly string[];
  /** Lo reservado, si el correo habla de un ítem. Va destacado, no escondido. */
  readonly highlight: string | null;
  readonly action: string;
  readonly link: string;
  /** Segundo enlace, si el correo pide un sí y un no (ADR-051). */
  readonly rejectAction: string | null;
  readonly rejectLink: string | null;
  /** Tercer enlace: WhatsApp al número de un aviso por teléfono (ADR-051). */
  readonly extraAction: string | null;
  readonly extraLink: string | null;
  readonly why: string;
}

export function renderEmailHtml(doc: EmailDocument): string {
  const paragraphs = doc.paragraphs
    .filter(noVacio)
    .map(
      (text) =>
        `<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:${INK};font-family:Georgia,'Times New Roman',serif;">${escapeHtml(text)}</p>`,
    )
    .join("");

  const highlight =
    doc.highlight === null
      ? ""
      : `<p style="margin:8px 0 28px;padding:12px 0 12px 16px;border-left:4px solid ${SAGE};font-size:20px;line-height:1.3;color:${OLIVE};font-family:Georgia,'Times New Roman',serif;">${escapeHtml(doc.highlight)}</p>`;

  const extra =
    doc.extraAction === null || doc.extraLink === null
      ? ""
      : `<p style="margin:28px 0 0;">
<a href="${escapeHtml(doc.extraLink)}" style="display:inline-block;padding:12px 24px;background:${FOREST};color:${PAPER};text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1;border-radius:999px;">${escapeHtml(doc.extraAction)}</a>
</p>`;

  const reject =
    doc.rejectAction === null || doc.rejectLink === null
      ? ""
      : `<p style="margin:16px 0 0;">
<a href="${escapeHtml(doc.rejectLink)}" style="display:inline-block;padding:12px 24px;background:${PAPER};color:${FOREST};border:1px solid ${FOREST};text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1;border-radius:999px;">${escapeHtml(doc.rejectAction)}</a>
</p>`;

  return `<!DOCTYPE html>
<html lang="${doc.lang}">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<meta name="viewport" content="width=device-width">
<title>${escapeHtml(doc.heading)}</title>
</head>
<body style="margin:0;padding:0;background:${PAPER};">
<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:${PAPER};">${escapeHtml(doc.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER};">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:${PAPER};">
<tr><td style="background:${FOREST};padding:32px 40px;">
<p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:12px;letter-spacing:0.14em;color:${SAGE};">${escapeHtml(doc.siteName.toUpperCase())}</p>
<h1 style="margin:12px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.15;font-weight:normal;color:${PAPER};">${escapeHtml(doc.heading)}</h1>
</td></tr>
<tr><td style="height:4px;line-height:4px;font-size:0;background:${SAGE};">&nbsp;</td></tr>
<tr><td style="padding:36px 40px 8px;">
${paragraphs}
${highlight}
${extra}
<p style="margin:${extra === "" ? "28px" : "16px"} 0 0;">
<a href="${escapeHtml(doc.link)}" style="display:inline-block;padding:12px 24px;background:${FOREST};color:${PAPER};text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1;border-radius:999px;">${escapeHtml(doc.action)}</a>
</p>
${reject}
</td></tr>
<tr><td style="padding:24px 40px 36px;">
<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.45;color:${MUTED};">${escapeHtml(doc.why)}</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

export function renderEmailText(doc: EmailDocument): string {
  const parts = [
    doc.siteName,
    doc.heading,
    "",
    ...doc.paragraphs.filter(noVacio),
    ...(doc.highlight === null ? [] : ["", doc.highlight]),
    "",
    ...(doc.extraAction === null || doc.extraLink === null
      ? []
      : [`${doc.extraAction}: ${doc.extraLink}`]),
    `${doc.action}: ${doc.link}`,
    ...(doc.rejectAction === null || doc.rejectLink === null
      ? []
      : [`${doc.rejectAction}: ${doc.rejectLink}`]),
    "",
    "—",
    doc.why,
  ];

  return parts.join("\n");
}

function noVacio(text: string): boolean {
  return text.length > 0;
}

/**
 * El contenido es del repositorio, no de la red, así que esto no es una defensa
 * contra un ataque: es contra un apóstrofe o un `&` en la prosa rompiendo el html
 * del correo en algún cliente viejo.
 */
export function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
