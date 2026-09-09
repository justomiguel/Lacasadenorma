/**
 * Qué archivo es realmente, y qué medidas tiene.
 *
 * El tipo se determina **por el contenido**, nunca por la extensión ni por el
 * `Content-Type` que declara el navegador. Los dos son texto que envía el cliente:
 * un SVG renombrado a `.png` llega con extensión `.png` y con
 * `type: "image/png"` si quien sube lo quiere así. Y un SVG **es un documento
 * ejecutable**: puede llevar `<script>`, y servido desde el bucket público de fotos
 * correría en el origen del sitio, con acceso a las cookies de sesión de cualquiera
 * que abra la imagen. Es la amenaza T6 del modelo, y es la razón por la que este
 * archivo existe en lugar de confiar en `file.type`.
 *
 * Las medidas se leen del encabezado del archivo porque `next/image` las necesita
 * para reservar el espacio y no producir CLS, y los Core Web Vitals son requisito
 * funcional (principio VII). Leerlas acá evita depender de que el navegador las
 * mande bien.
 *
 * Se implementa a mano y sin dependencias porque son cuatro formatos y unas pocas
 * decenas de bytes de cada uno. Una librería de detección de imágenes traería
 * decenas de formatos que este proyecto no acepta, y cada formato aceptado es
 * superficie de ataque.
 */

/** Los únicos tipos que el bucket público acepta. La lista es blanca, no negra. */
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

/** Tipos de comprobante. Incluye PDF, que no es imagen y no tiene medidas. */
export const ALLOWED_RECEIPT_TYPES = [...ALLOWED_IMAGE_TYPES, "application/pdf"] as const;

export type AllowedReceiptType = (typeof ALLOWED_RECEIPT_TYPES)[number];

export class UnsupportedFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsupportedFileError";
  }
}

export interface ImageInfo {
  readonly mimeType: AllowedImageType;
  readonly width: number;
  readonly height: number;
}

function startsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  return signature.every((byte, index) => bytes[index] === byte);
}

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

/**
 * Identifica el formato por su firma.
 *
 * Devuelve `null` para cualquier cosa que no reconozca, incluido el SVG: un SVG es
 * texto XML, así que no tiene firma binaria y cae acá por construcción. No se lo
 * detecta para rechazarlo con un mensaje especial, se lo rechaza por no estar en la
 * lista de aceptados, que es una regla que no se puede eludir con un truco de
 * formato nuevo.
 */
export function sniffFileType(bytes: Uint8Array): AllowedReceiptType | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) {
    return "image/jpeg";
  }

  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }

  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) {
    return "application/pdf";
  }

  // RIFF….WEBP. Los cuatro bytes del medio son el tamaño, así que se saltean.
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") {
    return "image/webp";
  }

  // AVIF es un contenedor ISOBMFF: `ftyp` en el offset 4 y la marca en el 8.
  if (ascii(bytes, 4, 4) === "ftyp") {
    const brand = ascii(bytes, 8, 4);

    if (brand === "avif" || brand === "avis") {
      return "image/avif";
    }
  }

  return null;
}

/**
 * Lee ancho y alto del encabezado.
 *
 * Sólo entiende los tres formatos cuyo encabezado es simple de leer sin decodificar.
 * AVIF guarda las medidas en una caja `ispe` anidada dentro de `meta`, y recorrer el
 * árbol de cajas para encontrarla sería escribir un parser de ISOBMFF: se rechaza y
 * se le pide a quien sube que convierta el archivo, que es una molestia razonable
 * frente a cien líneas de parser en el camino de una subida.
 */
function readDimensions(bytes: Uint8Array, type: AllowedImageType): {
  width: number;
  height: number;
} | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  if (type === "image/png") {
    // IHDR siempre es el primer chunk: ancho y alto en big-endian en 16 y 20.
    return { width: view.getUint32(16, false), height: view.getUint32(20, false) };
  }

  if (type === "image/jpeg") {
    return readJpegDimensions(bytes, view);
  }

  if (type === "image/webp") {
    return readWebpDimensions(bytes, view);
  }

  return null;
}

function readJpegDimensions(
  bytes: Uint8Array,
  view: DataView,
): { width: number; height: number } | null {
  // Se recorren los segmentos hasta encontrar un Start Of Frame. No se puede leer
  // un offset fijo: la cantidad de metadatos antes del SOF es variable.
  let offset = 2;

  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;

      continue;
    }

    const marker = bytes[offset + 1];

    if (marker === undefined) {
      return null;
    }

    // SOF0…SOF15, salteando los marcadores que no describen un frame.
    const isStartOfFrame =
      marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);

    if (isStartOfFrame) {
      return {
        height: view.getUint16(offset + 5, false),
        width: view.getUint16(offset + 7, false),
      };
    }

    offset += 2 + view.getUint16(offset + 2, false);
  }

  return null;
}

function readWebpDimensions(
  bytes: Uint8Array,
  view: DataView,
): { width: number; height: number } | null {
  const format = ascii(bytes, 12, 4);

  if (format === "VP8X") {
    // 24 bits little-endian, menos uno, en los offsets 24 y 27.
    const width = 1 + (view.getUint16(24, true) | (bytes[26]! << 16));
    const height = 1 + (view.getUint16(27, true) | (bytes[29]! << 16));

    return { width, height };
  }

  if (format === "VP8 ") {
    return {
      width: view.getUint16(26, true) & 0x3fff,
      height: view.getUint16(28, true) & 0x3fff,
    };
  }

  if (format === "VP8L") {
    const bits = view.getUint32(21, true);

    return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >> 14) & 0x3fff) };
  }

  return null;
}

/** Cota de tamaño. Una foto de obra tomada con un teléfono entra de sobra. */
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

/**
 * Valida una foto y devuelve su tipo real y sus medidas.
 *
 * Lanza `UnsupportedFileError` con un mensaje que la persona puede accionar. No
 * devuelve `null`: quien sube un archivo necesita saber por qué no se aceptó, y un
 * `null` obligaría a inventar el motivo en la pantalla (principio XII).
 */
export async function inspectImage(file: File): Promise<ImageInfo> {
  if (file.size === 0) {
    throw new UnsupportedFileError("El archivo está vacío.");
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new UnsupportedFileError(
      `El archivo pesa más de ${String(Math.round(MAX_UPLOAD_BYTES / 1024 / 1024))} MB. Sacale peso y volvé a intentar.`,
    );
  }

  // Alcanza con el encabezado: 64 bytes cubren la firma y las medidas de PNG y
  // WebP. Para JPEG hay que recorrer los segmentos, así que se leen 64 kB.
  const header = new Uint8Array(await file.slice(0, 65_536).arrayBuffer());
  const type = sniffFileType(header);

  if (type === null) {
    throw new UnsupportedFileError(
      "No reconocemos el formato del archivo. Se aceptan JPEG, PNG y WebP.",
    );
  }

  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(type)) {
    throw new UnsupportedFileError(
      `El archivo es ${type}, y en las fotos se aceptan JPEG, PNG y WebP.`,
    );
  }

  const imageType = type as AllowedImageType;
  const dimensions = readDimensions(header, imageType);

  if (dimensions === null || dimensions.width <= 0 || dimensions.height <= 0) {
    throw new UnsupportedFileError(
      "No pudimos leer el tamaño de la imagen. Probá guardándola de nuevo como JPEG o PNG.",
    );
  }

  return { mimeType: imageType, ...dimensions };
}

/**
 * Valida un comprobante. Acepta además PDF, que es lo que emite una factura, y no
 * necesita medidas porque no se renderiza como imagen: se descarga con una URL
 * firmada.
 */
export async function inspectReceipt(
  file: File,
): Promise<{ mimeType: AllowedReceiptType; sizeBytes: number }> {
  if (file.size === 0) {
    throw new UnsupportedFileError("El archivo está vacío.");
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new UnsupportedFileError(
      `El archivo pesa más de ${String(Math.round(MAX_UPLOAD_BYTES / 1024 / 1024))} MB.`,
    );
  }

  const header = new Uint8Array(await file.slice(0, 4096).arrayBuffer());
  const type = sniffFileType(header);

  if (type === null) {
    throw new UnsupportedFileError(
      "No reconocemos el formato del archivo. Se aceptan JPEG, PNG, WebP y PDF.",
    );
  }

  return { mimeType: type, sizeBytes: file.size };
}

/**
 * Nombre de archivo seguro para el bucket.
 *
 * No se conserva el nombre original: un nombre de archivo es una cadena que eligió
 * quien sube, puede contener `../`, puede tener 4000 caracteres y puede filtrar
 * información del disco de la persona. Se genera uno nuevo y se guarda el original
 * en una columna, donde es un dato y no una ruta.
 */
export function storageKeyFor(mimeType: AllowedReceiptType, now = new Date()): string {
  const extension = EXTENSIONS[mimeType];
  const stamp = now.toISOString().slice(0, 10);

  return `${stamp}/${crypto.randomUUID()}.${extension}`;
}

const EXTENSIONS: Record<AllowedReceiptType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "application/pdf": "pdf",
};
