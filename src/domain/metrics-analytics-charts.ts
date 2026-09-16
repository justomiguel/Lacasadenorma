/**
 * Gráficos de alcance. Viven aparte para que el snapshot no se mezcle con
 * las etiquetas (max-lines).
 */

import type { AnalyticsEvent } from "./ports/analytics";
import type { BarChart, ChartPoint, SeriesChart } from "./metrics";
import { countBar } from "./metrics-counts";

interface NamedCount {
  readonly name: string;
  readonly value: number;
}

interface DayCount {
  readonly date: string;
  readonly visitors: number;
  readonly pageviews: number;
}

const EVENT_LABELS: Record<AnalyticsEvent["name"], string> = {
  ayudar_click: "Clic en Ayudar",
  metodo_visto: "Vio un método",
  dato_copiado: "Copió un dato",
  compartir: "Compartir",
  whatsapp_click: "WhatsApp",
  llamar_click: "Llamar",
  medio_externo_click: "Medio externo",
};

const DEVICE_LABELS: Record<string, string> = {
  desktop: "Escritorio",
  laptop: "Portátil",
  mobile: "Teléfono",
  tablet: "Tableta",
};

const SOURCE_LABELS: Record<string, string> = {
  "(direct)": "Directo",
  direct: "Directo",
};

const ORIGIN_LABELS: Record<string, string> = {
  menu: "Menú",
  encabezado: "Encabezado",
  barra: "Barra",
  apertura: "Apertura",
  contacto: "Contacto",
  "que-paso": "Qué pasó",
  legado: "Legado",
  "404": "Página no encontrada",
  transparencia: "Transparencia",
  reconstruccion: "Reconstrucción",
  "paypal-cancelada": "PayPal cancelada",
  home: "Inicio",
};

const FIELD_LABELS: Record<string, string> = {
  alias: "Alias",
  cbu: "CBU",
  cuenta_argentina: "Cuenta Argentina",
  rut: "RUT",
  cuenta_chile: "Cuenta Chile",
  email: "Correo",
};

const SHARE_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  x: "X",
  sistema: "El sistema",
  enlace: "Copiar enlace",
};

const PAYMENT_LABELS: Record<string, string> = {
  mercadopago: "Mercado Pago",
  paypal: "PayPal",
};

export function pageviewsChart(
  periodDays: number,
  timeseries: readonly DayCount[],
): SeriesChart | null {
  if (timeseries.every((day) => day.pageviews === 0 && day.visitors === 0)) {
    return null;
  }

  const points: ChartPoint[] = timeseries.map((day) => ({
    key: day.date,
    label: formatDay(day.date),
    values: { visitors: day.visitors, pageviews: day.pageviews },
  }));

  return {
    id: "pageviews",
    title: `Visitantes y vistas · ${String(periodDays)} días`,
    unit: "count",
    currency: null,
    series: [
      { id: "visitors", label: "Visitantes" },
      { id: "pageviews", label: "Vistas" },
    ],
    points,
    signals: [],
  };
}

export function namedChart(
  id: string,
  title: string,
  items: readonly NamedCount[],
  label: (name: string) => string = (name) => name,
): BarChart | null {
  return countBar(
    id,
    title,
    items.map((item) => ({ id: item.name, label: label(item.name), value: item.value })),
    false,
  );
}

export function eventTotal(
  events: readonly NamedCount[],
  name: AnalyticsEvent["name"],
): number | null {
  const found = events.find((item) => item.name === name);

  return found === undefined ? null : found.value;
}

export function eventLabel(name: string): string {
  return EVENT_LABELS[name as AnalyticsEvent["name"]] ?? name;
}

export function deviceLabel(name: string): string {
  return DEVICE_LABELS[name.toLowerCase()] ?? name;
}

export function sourceLabel(name: string): string {
  const key = name.trim() === "" ? "(direct)" : name.trim().toLowerCase();

  return SOURCE_LABELS[key] ?? name;
}

export function originLabel(name: string): string {
  return ORIGIN_LABELS[name] ?? name;
}

export function fieldLabel(name: string): string {
  return FIELD_LABELS[name] ?? name;
}

export function shareLabel(name: string): string {
  return SHARE_LABELS[name] ?? name;
}

export function paymentLabel(name: string): string {
  return PAYMENT_LABELS[name] ?? name;
}

export function entryPageLabel(name: string): string {
  return name === "/" ? "Inicio" : name;
}

function formatDay(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }

  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(date);
}
