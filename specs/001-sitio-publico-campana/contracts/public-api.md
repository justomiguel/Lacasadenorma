# Contrato — API pública

Superficie HTTP mínima. Existe para dos consumidores: el adaptador WebMCP (que hace `fetch` desde el
navegador) y cualquier integración futura. **No** existe para la UI, que llama a los casos de uso
directamente desde Server Components.

Reglas transversales:

- Todo es `GET`. No hay endpoints de mutación públicos.
- Sólo devuelve datos ya publicados. Nunca datos personales, rutas de comprobantes ni aportes
  individuales.
- Respuestas pequeñas y acotadas; sin paginación porque ningún conjunto es grande.
- `Cache-Control: public, max-age=60, stale-while-revalidate=300`.
- Límite de tasa por IP. Al excederlo: `429` con `Retry-After`.
- Errores con forma estable: `{ error: { code, message } }`, con `message` en castellano llano y sin
  detalle interno.

---

## `GET /api/public/campaign-status`

```json
{
  "goalMinor": null,
  "raisedMinor": 0,
  "percent": null,
  "currency": "ARS",
  "reconciledAt": null,
  "updatedAt": "2026-09-09T19:00:00.000Z"
}
```

`null` significa "no verificado todavía", y es distinto de `0`. Quien consuma esto **no** debe
mostrar `0%` cuando `percent` es `null`.

## `GET /api/public/donation-methods?country=AR`

```json
{ "methods": [] }
```

Lista vacía significa que ningún método está publicado. No es un error.

## `GET /api/public/reconstruction-progress`

```json
{
  "milestones": [],
  "completedCount": 0,
  "totalCount": 0,
  "percentComplete": null,
  "budgetItems": []
}
```

## `GET /api/public/norma-story`

```json
{
  "name": "Norma",
  "roleLabel": "Comunicadora social de Riacho He Hé",
  "place": "Riacho He Hé, Formosa, Argentina",
  "summary": "…",
  "paragraphs": ["…"],
  "bornOn": null,
  "diedOn": null
}
```

## `GET /api/public/transparency-summary`

```json
{
  "receivedMinor": 0,
  "spentMinor": 0,
  "balanceMinor": 0,
  "currency": "ARS",
  "executedPercent": null,
  "expenseCount": 0,
  "receiptCount": 0,
  "byCategory": [],
  "reconciledAt": null,
  "detailUrl": "https://…/transparencia"
}
```

## `GET /api/health`

```json
{ "status": "ok", "version": "<sha>", "dataSource": "content-only" | "supabase", "time": "…" }
```

`dataSource` dice de dónde vienen las cifras. Es la forma rápida de diagnosticar un despliegue que
levanta pero no ve la base. No expone ninguna configuración ni secreto.

---

## Códigos de estado

| Código | Cuándo |
|---|---|
| `200` | Éxito, incluidos conjuntos vacíos |
| `400` | Parámetro inválido (por ejemplo, `country=XX`) |
| `429` | Límite de tasa excedido |
| `503` | La fuente de datos no está disponible. **No** se devuelven ceros como si fueran datos reales |

El `503` es deliberado: un cero silencioso sería un dato falso, y el principio XII lo prohíbe.
