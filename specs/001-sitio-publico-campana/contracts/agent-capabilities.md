# Contrato — Capacidades para agentes

Cinco capacidades, **todas de sólo lectura**. Se declaran una vez en
`src/application/agent-capabilities/` y las consumen cuatro adaptadores: la UI, el endpoint REST
público, WebMCP, y en el futuro un servidor MCP.

Reglas que este contrato impone (constitución IX, threat model A1–A6):

- Ninguna capacidad muta estado. Ninguna inicia, confirma ni facilita una operación financiera.
- Ninguna devuelve datos personales ni información no publicada.
- La entrada se valida en el servidor con Zod **aunque** el esquema ya la declare: un esquema es una
  pista para quien llama, no una frontera de seguridad.
- Los errores se devuelven como prosa accionable, no como excepciones opacas: el texto lo lee un
  modelo que puede corregirse y reintentar.
- Presupuestos de Chrome respetados: nombre ≤ 30 caracteres, descripción ≤ 500, salida ≤ 1500.

---

## Forma de una capacidad

```ts
interface AgentCapability<TInput, TOutput> {
  name: string;                     // snake_case, ≤ 30 caracteres, [a-z0-9_]
  title: string;                    // para UI, en castellano
  description: string;              // literal y afirmativa; sin instrucciones al modelo
  input: ZodType<TInput>;
  readOnly: true;                   // el tipo lo fija: hoy no hay capacidades mutantes
  run(input: TInput, ctx: CapabilityContext): Promise<TOutput>;
  format(output: TOutput): string;  // texto breve para agentes
}
```

`readOnly` está tipado como el literal `true`, no como `boolean`. Agregar una capacidad mutante
requiere cambiar el tipo, lo que fuerza una decisión consciente y una enmienda de la spec.

---

## `get_campaign_status`

Estado de la recaudación.

**Entrada**: ninguna (`{}` con `additionalProperties: false`).

**Salida**:

| Campo | Tipo | Nota |
|---|---|---|
| `goalMinor` | entero \| `null` | `null` si el objetivo no está verificado |
| `raisedMinor` | entero | Excluye anulados |
| `percent` | número \| `null` | `null` si no hay objetivo. **Nunca `0` por falta de dato** |
| `currency` | `"ARS"` \| … | |
| `reconciledAt` | fecha ISO \| `null` | Última conciliación bancaria |
| `updatedAt` | fecha ISO | |

**Texto**: `"Se recaudaron $X de un objetivo de $Y (Z%). Cifras conciliadas al D de M."`
Si falta el objetivo: `"Se recaudaron $X. El objetivo todavía no está publicado."`

---

## `get_donation_methods`

Formas públicas de colaborar.

**Entrada**: `{ country?: "AR" | "CL" | "US" }`.

**Salida**: lista de `{ country, currency, label, kind, fields: [{ label, value }], instructions }`.

Sólo métodos con `published_at` no nulo. Si no hay ninguno publicado, devuelve lista vacía y el
texto lo dice explícitamente: **no** se inventan datos bancarios en ningún caso.

---

## `get_reconstruction_progress`

Avance de la obra.

**Entrada**: ninguna.

**Salida**: `{ milestones: [{ title, status, happenedOn }], completedCount, totalCount,
percentComplete, budgetItems: [{ title, estimatedMinor, currency }] }`.

`percentComplete` se calcula sobre hitos completados, no sobre dinero: son dos medidas distintas y
confundirlas sería engañoso.

---

## `get_norma_story`

Información pública sobre Norma y el proyecto.

**Entrada**: ninguna.

**Salida**: `{ name, roleLabel, place, summary, paragraphs: string[], bornOn, diedOn }`.

`bornOn` y `diedOn` son `null` mientras la familia no publique las fechas. La capacidad **no** las
estima ni las deduce.

---

## `get_transparency_summary`

Resumen de la rendición.

**Entrada**: ninguna.

**Salida**:

| Campo | Nota |
|---|---|
| `receivedMinor`, `spentMinor`, `balanceMinor` | Por moneda; sin conversión |
| `currency` | |
| `executedPercent` | `null` si no hay objetivo |
| `expenseCount`, `receiptCount` | Cantidades, no los archivos |
| `byCategory` | `[{ category, amountMinor }]` |
| `reconciledAt` | |
| `detailUrl` | Enlace a la página pública, para que el agente pueda citarla |

**No** devuelve rutas de comprobantes, ni aportes individuales, ni identidades.

---

## Adaptadores

| Adaptador | Registro | Retorno |
|---|---|---|
| **UI** | Llamada directa al caso de uso desde un Server Component | Objeto tipado |
| **REST** | `GET /api/public/<name>` | JSON de la salida |
| **WebMCP** | `document.modelContext.registerTool({ name, title, description, inputSchema: z.toJSONSchema(input), annotations: { readOnlyHint: true }, execute })` | Valor serializable, o el texto de `format()` |
| **MCP (futuro)** | `server.registerTool(name, { description, inputSchema }, handler)` | `{ content: [{ type: "text", text }] }` |

Las diferencias entre WebMCP y MCP son exactamente tres —cómo se registra, el formato del esquema y
la forma del retorno—, y las tres viven en el adaptador. La lógica y la autorización son una sola
para todos.

**Notas de WebMCP verificadas** (ver `docs/research/2026-09-agent-web-standards.md`):

- El punto de entrada es `document.modelContext`, no `navigator.modelContext` (eliminado).
- No existe `unregisterTool`: se desregistra abortando el `AbortSignal` de registro.
- Registrar dos veces el mismo nombre lanza `InvalidStateError` a propósito, como defensa contra la
  suplantación de herramientas.
- El retorno **no** es `{ content: [...] }`: eso es MCP. El navegador serializa lo que se devuelva.
- Requiere contexto seguro, `Window`, documento aislado por origen y la Permissions Policy `tools`.
