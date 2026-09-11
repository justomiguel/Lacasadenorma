# ADR-020 · El rastro de auditoría es obligatorio en el tipo, no una convención

**Estado**: Aceptada · **Fecha**: 2026-09-10

## Contexto

`perform` es el único camino por el que pasan las quince operaciones del backoffice, y una de sus
tres reglas es que la operación deja una entrada en `audit_log`. La regla estaba escrita en el
comentario de la función y el parámetro que la implementa era **opcional**:

```ts
/** Ausente cuando la operación no cambia nada auditable (por ejemplo, un borrador). */
readonly audit?: (input: Input, output: Output) => AuditTrail;
```

La auditoría de cierre del backoffice recorrió las quince operaciones y encontró que tres no pasaban
`audit`: `saveUpdate`, `addUpdatePhoto` y `saveMilestone`. La excusa del comentario cubre una de las
tres a medias y ninguna del todo:

- **`saveMilestone` audita su hermana exacta y ella no.** `saveBudgetItem` tiene la misma forma —`id`
  nullable, título, `sortOrder`, casilla `publish`— y escribe `budget_item.created` o
  `budget_item.updated`. Las dos publican contenido del sitio con una casilla; una deja rastro y la
  otra no, y nada explica la diferencia. Más aún: `AUDIT_ENTITY_LABELS` ya traía la entrada
  `milestones: "Hitos"`, la etiqueta para leer un rastro que nadie escribía.
- **`saveUpdate` no es sólo un borrador.** Recibe un `id` opcional, así que es también la operación
  con la que se edita el texto de una novedad **ya publicada**. Cambiar lo que dice una publicación
  del sitio sin dejar rastro es precisamente lo que `/admin/auditoria` existe para poder contestar.
- **`addUpdatePhoto` sube un archivo a un bucket público** y lo cuelga de una novedad que puede estar
  publicada.

Ninguna de las tres viola FR-016, que pide el rastro para los datos financieros y sólo para ellos.
Pero ninguna estaba documentada como excepción, en ningún lado: ni en `data-model.md`, ni en
`docs/security.md`, ni en un ADR. No eran una decisión, eran un olvido, y el olvido lo hizo posible
el signo de pregunta del tipo.

## Decisión

**`audit` pasa a ser obligatorio en `PerformOptions`, y las tres operaciones que faltaban escriben su
entrada.**

| Operación | Acción | Entidad | Qué guarda el `diff` |
|---|---|---|---|
| `saveUpdate` | `update.created` / `update.updated` | `updates` | `slug` y título. **No** el cuerpo |
| `addUpdatePhoto` | `update.photo_added` | `updates` | Identificador de la foto y su texto alternativo |
| `saveMilestone` | `milestone.created` / `milestone.updated` | `milestones` | Título, estado y si quedó publicado |

Tres detalles de la forma:

- **La entidad de una foto es la novedad, no la foto.** Quien lee el registro pregunta qué le pasó a
  una novedad; el identificador de la fila de `media` no contesta nada. `entity_id` apunta a la
  novedad y el de la foto queda en el `diff`.
- **El cuerpo de la novedad no va al `diff`.** Son hasta veinte mil caracteres, y el registro es una
  lista de qué pasó, no un historial de versiones del texto. Si alguna vez hace falta el texto
  anterior, eso es versionado de contenido y es otra tabla.
- **Un borrador guardado tres veces deja tres entradas.** Es el costo aceptado: la alternativa es
  leer el estado de publicación antes de decidir si auditar, o sea un viaje más a la base y una regla
  condicional en el lugar donde justamente no queremos una.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Dejar `audit` opcional y documentar las tres excepciones | Documenta el estado, no la regla. El próximo caso de uso se escribe copiando el de al lado, y si el de al lado no audita, el nuevo tampoco. La propiedad que queremos —"toda operación del backoffice deja rastro"— se verifica hoy leyendo quince funciones; con el tipo obligatorio se verifica compilando |
| Auditar sólo cuando la entidad está publicada | Pide leer el estado antes de escribir el rastro, y la condición se evalúa en el lugar exacto donde un error pasa desapercibido: si la lectura falla o devuelve `null`, la rama que se toma es la de no auditar. Un control que se apaga solo cuando algo anda mal no es un control |
| Un trigger `after insert or update` en cada tabla auditable | Ya está descartado en [ADR-019](./019-auditoria-por-funcion.md) por el mismo motivo: el `diff` lo redacta el caso de uso para que no contenga datos sensibles, y un trigger sólo ve columnas |
| Ampliar FR-016 para que exija el rastro más allá de lo financiero | El requisito funcional describe el mínimo que el producto promete; esto es cómo lo cumplimos con margen. La invariante va acá y en `docs/security.md`, y la descripción de la entidad *Registro de auditoría* del `spec.md` —"quién cambió qué y cuándo"— ya la admite sin cambios |

## Consecuencias

**Buenas.**

- "Toda operación del backoffice deja rastro" pasa de ser una frase en un comentario a una propiedad
  que el compilador sostiene. Una operación nueva sin `audit` no compila.
- El registro contesta ahora las preguntas de contenido que antes no podía: quién editó el texto de
  una novedad publicada, quién agregó esa foto, quién marcó un hito como completado.
- La etiqueta `milestones: "Hitos"`, que estaba de más, pasa a corresponder a filas reales.

**Malas y aceptadas.**

- **El registro tiene más volumen, y parte es ruido**: guardar un borrador aparece igual que publicar.
  `/admin/auditoria` lista por fecha descendente y paginado, así que el costo lo paga quien busca
  algo viejo. Si el ruido molesta, la respuesta es filtrar por acción en la pantalla, no dejar de
  registrar.
- **Una foto que falla al auditarse deja la foto subida.** `perform` escribe el rastro después de que
  la operación salió bien, así que si la entrada falla, la mutación ya ocurrió y la pantalla informa
  el error. Es la ventana de no atomicidad que [ADR-019](./019-auditoria-por-funcion.md) deja abierta
  y que ahora abarca tres operaciones más. Sigue anotada como deuda conocida en `docs/security.md`.
