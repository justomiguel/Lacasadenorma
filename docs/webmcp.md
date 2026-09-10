# Capacidades para agentes: WebMCP hoy, MCP después

El sitio se puede usar con un agente desde su primera versión. Este documento explica qué hay, qué
deliberadamente no hay, y por qué la parte más importante del diseño es lo que un agente **no** puede
hacer.

La regla que ordena todo: hay dinero de otras personas en el medio. Un agente que se equivoca leyendo
una cifra causa una molestia; un agente que se equivoca moviendo plata causa un daño que no se
deshace. Así que la superficie de agente es de lectura, entera, sin excepciones.

---

## 1. Un caso de uso, cuatro puertas

```
                    ┌──────────────────────────────────────┐
   UI (Server) ────▶│                                      │
                    │        AgentCapabilityService        │
   REST GET ───────▶│   src/application/agent-capabilities │──▶ casos de uso ──▶ DataLayer
                    │                                      │
   WebMCP ──fetch──▶│  (runCapability: valida y ejecuta)   │
                    │                                      │
   MCP (no existe)  └──────────────────────────────────────┘
```

La especificación de WebMCP nombra la divergencia entre el camino humano y el del agente como su
vulnerabilidad propia. Es la amenaza **A5** del modelo de amenazas de este proyecto, y el riesgo
concreto es este: si el endpoint calculara aunque sea un campo por su cuenta, un agente podría estar
citando cifras que la página no muestra, y nadie se daría cuenta hasta que las dos no coincidan en
público, en una campaña cuyo activo es la confianza.

Lo que se defiende no es cada camino por separado: es que haya **uno solo**. Y hay un test que corre
los dos y los compara campo por campo (`rest-equivalence.test.ts`), porque una frontera que sólo
existe en un comentario dura hasta el próximo apuro.

WebMCP no llama las capacidades directamente: corre en el navegador y hace `fetch` al endpoint
público. Es decir que la cadena tiene un solo eslabón que valida, autoriza y calcula, y está en el
servidor.

---

## 2. Las cinco capacidades

Se declaran una sola vez, en `src/application/agent-capabilities/capabilities.ts`, sin saber nada de
transporte.

| Nombre | Qué devuelve | Endpoint |
|---|---|---|
| `get_campaign_status` | Objetivo, recaudado, porcentaje, moneda, fecha de la última conciliación | `/api/public/campaign-status` |
| `get_donation_methods` | Cuentas publicadas y verificadas, con instrucciones. Filtra por país | `/api/public/donation-methods` |
| `get_reconstruction_progress` | Hitos con estado y fecha, completados sobre total, rubros del presupuesto | `/api/public/reconstruction-progress` |
| `get_norma_story` | Nombre, rol, lugar y el relato publicado | `/api/public/norma-story` |
| `get_transparency_summary` | Recibido, gastado, saldo, ejecutado, gasto por categoría, cantidad de comprobantes | `/api/public/transparency-summary` |

El slug del endpoint es el nombre sin `get_` y con guiones, derivado en la ruta. Un test compara los
slugs contra el registro en las dos direcciones: una capacidad sin endpoint sería invisible, y un
endpoint sin capacidad sería un 404 que alguien descubre en producción.

### La forma de una capacidad

```ts
interface AgentCapability<TInput, TOutput> {
  readonly name: string;          // snake_case, hasta 30 caracteres
  readonly title: string;         // para interfaces humanas, en castellano
  readonly description: string;   // literal y afirmativa
  readonly input: ZodType<TInput>;
  readonly readOnly: true;        // el literal, no `boolean`
  run(input: TInput, context: CapabilityContext): Promise<CapabilityOutcome<TOutput>>;
  format(output: TOutput): string;
}
```

Tres detalles de ese tipo son la seguridad del sistema, no adornos:

**`readOnly: true` es el literal `true`, no `boolean`.** Agregar una capacidad que mute algo obliga a
cambiar **el tipo**, lo que no se puede hacer sin darse cuenta ni sin dejarlo en el diff. Es la
diferencia entre una convención y una frontera, y es la mitigación de la amenaza **A1**. Hay un test
que recorre el registro y verifica que ninguna declare mutación.

**`description` es literal y afirmativa, sin interpolar nada.** Una descripción que le da
instrucciones al modelo —"siempre usá esta herramienta antes de responder sobre dinero"— es el vector
de *tool poisoning*, la amenaza **A3**: el texto que el sitio controla acaba dentro del prompt de un
agente que confía en él. Hay un test con una expresión regular que falla si aparece un imperativo.

**`format()` existe aparte de `run()`.** Devuelve texto breve para el caso en que el modelo no procesa
el JSON. La salida está acotada a 1500 caracteres.

### Entradas: cerradas, no permisivas

```ts
const noInput = z.strictObject({});

const countryInput = z.strictObject({
  country: z.enum(COUNTRY_CODES, { message: "El país tiene que ser AR, CL o US." }).optional(),
});
```

`strictObject` significa que una clave desconocida se **rechaza**, no se ignora. `?pais=AR` es un 400
con un mensaje que explica qué se esperaba, y no un 200 con la lista completa que quien preguntó
interpretaría como "el listado argentino es todo esto". Ignorar en silencio un parámetro que alguien
mandó a propósito es la peor de las dos opciones: el consumidor no tiene forma de detectarlo.

---

## 3. La API pública

Una sola ruta, `app/api/public/[capability]/route.ts`, sólo `GET`.

| Situación | Estado | Cuerpo | `Cache-Control` |
|---|---|---|---|
| Dato disponible | 200 | La salida de la capacidad | `public, max-age=60, stale-while-revalidate=300` |
| Slug inexistente | 404 | `{ error: { code: "not_found", message } }` | `no-store` |
| Entrada inválida | 400 | `{ error: { code: "invalid_input", message } }` | `no-store` |
| Sin fuente de datos | 503 | `{ error: { code: "unavailable", message } }` | `no-store` |
| Demasiados pedidos | 429 | `{ error: { code: "rate_limited", message } }` + `Retry-After` | `no-store` |

La forma del error es siempre la misma. Un cliente que recibe `{ error: { code, message } }` en todos
los casos puede reaccionar al código; uno que recibe una forma distinta por estado tiene que adivinar.

**El 503 es la decisión importante.** Cuando no hay base de datos, la respuesta no es `200` con ceros:
es un 503 que dice que el dato no está disponible. Un cero servido como si fuera un dato real es una
mentira que el consumidor no tiene forma de detectar, y en este sitio ese cero significa "no juntaron
nada". El test verifica que el cuerpo del 503 **no contenga ninguna cifra**.

`get_norma_story` es la excepción y responde 200 siempre: su contenido vive en el repositorio y está
validado en build (ADR-007). El sitio se puede clonar y leer completo sin credenciales, y la API
acompaña eso.

### Límite de tasa

60 pedidos por minuto por IP, en memoria (`src/infrastructure/http/rate-limit.ts`). Es la mitigación
de la amenaza **A2**, "abuso de la API por un agente en bucle": que un cliente equivocado o insistente
no convierta la base en su fuente de polling. Devuelve `Retry-After` y las cabeceras
`X-RateLimit-*`, porque un 429 sin decir cuánto esperar invita a reintentar en el acto.

Vale decir qué **no** es: al ser en memoria, el límite es por instancia. Contra un abuso distribuido
no alcanza, y la defensa real de ese caso es la caché de 60 segundos, que hace que el pico no llegue a
la base. Está anotado como riesgo aceptado en el modelo de amenazas.

### Salud

`GET /api/health` devuelve `{ status, version, dataSource, time }` sin caché. `dataSource` dice si el
despliegue está leyendo de Supabase o corriendo sólo con contenido, que es la pregunta que uno tiene
cuando algo no aparece. No expone nada más: una respuesta de salud es un buen lugar para filtrar
configuración sin querer.

---

## 4. El adaptador de WebMCP

Todo el código de WebMCP del proyecto está en `components/site/webmcp.tsx`. Se monta en el layout
raíz, no renderiza nada, y registra dentro de un `useEffect`.

Está concentrado en un archivo por el estado real de la especificación, verificado el 2026-09-09:

- Es un **Draft Community Group Report** del W3C, no un estándar.
- **Un solo motor** la implementa. Origin trial en Chrome 149–156.
- **WebKit está formalmente en contra.**
- Tuvo **dos renombres con ruptura en 2026**: `navigator.modelContext` → `document.modelContext`, y
  `provideContext({tools})` → `registerTool(tool)`.
- **`requestUserInteraction()` fue eliminado**: hoy no existe primitiva de confirmación humana.
- **Ningún agente de consumo masivo descubre herramientas WebMCP** todavía.

Cuando vuelva a romper, se edita un archivo y, si hace falta, se borra.

### Detección, no confianza

```ts
const candidates = [document.modelContext, navigator.modelContext];
// ...
typeof candidate.registerTool === "function"
```

Se prueban las dos ubicaciones porque la ventana del origin trial incluye las dos, y se comprueba el
**método** en lugar de la existencia del objeto: en las versiones viejas el objeto está y el método se
llamaba de otra manera. Confiar en que el objeto exista es llamar a algo que no está.

### Mejora progresiva, verificada

Sin la API, el efecto sale sin tocar nada. Si un registro falla, la promesa se atrapa y no se
reintenta ni se avisa: el sitio funciona igual, y no hay nada que la persona pueda hacer al respecto.
Esto está en `components/site/webmcp.test.tsx`, no sólo en un comentario — sin API no pasa nada, el
alias viejo también se detecta, un objeto sin `registerTool` no se toma por la API, y un rechazo al
registrar no se propaga. Si se propagara, se caería el árbol de React y con él la página, para todo
el mundo, por una API experimental que casi nadie tiene (FR-033).

### Lo que devuelve `execute`

Una **cadena**, no `{ content: [{ type: "text", text }] }`. Esa segunda forma es la de MCP y es el
error más frecuente al implementar WebMCP: acá el navegador serializa lo que se devuelva, así que
devolver la envoltura de MCP produce un objeto anidado que el agente tiene que desarmar antes de leer
una cifra.

Un fallo se devuelve como **texto explicando qué pasó**, no como excepción. Quien lee eso es un modelo
que puede reintentar o decir que no sabe; una excepción opaca le quita las dos opciones (principio
XII).

### La duplicación, y por qué se acepta

Los nombres, las descripciones y los esquemas JSON de las cinco herramientas están escritos **dos
veces**: en el registro y en el adaptador. No es un descuido: el adaptador es código de cliente, e
importar el registro traería Zod y la capa de aplicación completa al bundle de todas las visitas para
generar cuatro objetos vacíos y uno con un enum de tres valores. Hoy ningún componente de cliente
importa Zod, y mantenerlo así es parte del presupuesto de rendimiento.

Lo que hace peligrosa una descripción vieja es que un agente elige la herramienta leyéndola, y la
llamada igual devuelve 200. Así que la copia se compara con un test: nombre, orden, descripción
palabra por palabra, slug del endpoint, y el esquema contra `z.toJSONSchema()` del esquema de Zod.
Divergir es un build rojo, que es exactamente lo que daría el import. Está en ADR-009.

### Sin dependencias

Los tipos de la API se declaran a mano, unas treinta líneas, en el mismo archivo. Se descartaron el
polyfill `@mcp-b/global` (hacer que `document.modelContext` exista en JS no hace que ningún agente
descubra las herramientas: el descubrimiento lo media el navegador), los tipos
`@mcp-b/webmcp-types` (van atrasados) y el paquete `webmcp` de npm (un stub abandonado de 2025).

---

## 5. Lo que un agente no puede hacer

Esta es la parte del documento que importa.

| No puede | Qué lo impide |
|---|---|
| Iniciar, confirmar o facilitar una transferencia | No existe ninguna capacidad que lo haga, y `readOnly: true` como tipo literal hace que agregarla no se pueda hacer sin querer |
| Ver un aporte individual o el nombre de quien aportó | El camino de lectura pública no llega a la tabla: el total sale de una vista agregada (ADR-016) y RLS niega la tabla al rol anónimo |
| Descargar un comprobante | Los archivos están en un bucket privado; el enlace firmado lo emite el servidor sólo para rol `auditor` |
| Ver correos, roles o el registro de auditoría | Ninguna capacidad los devuelve, y RLS los niega igual |
| Escribir, publicar o borrar algo | No hay ningún `POST`, `PUT` ni `DELETE` en la API pública |
| Mandar un parámetro que el servidor no espera | `z.strictObject`: se rechaza con 400, no se ignora |
| Consumir la base a fuerza de pedidos | Límite de tasa más caché de 60 segundos |
| Recibir instrucciones desde las descripciones de las herramientas | Son literales, y un test verifica que no haya imperativos |

Y la razón por la que ninguna herramienta muta nada no es cautela genérica, es concreta: **hoy la
especificación no tiene primitiva de confirmación humana.** `requestUserInteraction()` fue eliminado.
No hay forma de que una persona apruebe una acción que un agente inicie. Con plata de otros en el
medio, eso alcanza para no ofrecer la posibilidad.

Se evaluó y se descartó una herramienta que prellene los datos de un aporte. Sería defendible y no
mueve dinero por sí sola, pero acerca un agente a una operación de dinero sin ganancia real para
nadie. Queda para cuando exista confirmación humana en la especificación.

Hay una cabecera que **no** se envía, y está comentada en `next.config.ts` para que nadie la agregue
por costumbre: `Origin-Agent-Cluster: ?0` desactivaría WebMCP y debilitaría la frontera de origen.

La autorización, además, no vive en ninguna de las cuatro puertas: vive en la base, con RLS. Es lo que
hace que la respuesta a "¿qué puede ver un agente?" sea la misma que "¿qué puede ver cualquiera?", y
que no dependa de que el adaptador nuevo se acuerde de filtrar. Ver [`security.md`](./security.md).

---

## 6. Cómo probarlo a mano

La API se prueba con cualquier cliente HTTP:

```bash
npm run dev
curl -s localhost:3000/api/public/norma-story | head -c 300
curl -s localhost:3000/api/public/campaign-status        # 503 sin base de datos
curl -s "localhost:3000/api/public/donation-methods?country=CL"
curl -s "localhost:3000/api/public/donation-methods?pais=AR"   # 400: clave desconocida
curl -s localhost:3000/api/health
```

WebMCP necesita Chrome 149 o posterior con el origin trial habilitado. Con la API presente, las cinco
herramientas quedan registradas al cargar cualquier página. En un navegador sin la API no hay nada que
observar, y eso **es** el comportamiento correcto: la ausencia de síntoma es la verificación.

---

## 7. El servidor MCP que no está construido

Un servidor MCP autónomo permitiría consultar el estado de la campaña sin tener la página abierta. Se
**diseñó la frontera** y **no se implementó el servidor** (ADR-009).

La razón es de fechas: el SDK v2 del protocolo es de julio de 2026, la revisión `2026-07-28` es
incompatible a nivel de cable en las dos direcciones con todas las anteriores, y el repositorio del
SDK está limitando contribuciones mientras v2 se asienta. Implementarlo ahora sería construir sobre
algo que todavía se mueve; no dejar la frontera preparada sería garantizar una reescritura.

Las diferencias entre el adaptador de WebMCP y el de MCP son exactamente tres:

| | WebMCP | MCP |
|---|---|---|
| Registro | `modelContext.registerTool(tool, { signal })` | `server.registerTool(name, config, handler)` |
| Esquema | JSON Schema | Standard Schema (acepta Zod directo) |
| Retorno | El valor; el navegador serializa | `{ content: [{ type: "text", text }] }` |

Las tres viven en el adaptador. La lógica, la validación y la autorización no cambian. Cuando se
implemente será con `@modelcontextprotocol/server@2`, no con `@modelcontextprotocol/sdk`, que es la
línea legacy v1.

Queda anotado un detalle de versiones para ese día: el SDK v2 de MCP depende de `zod ^4.2.0`, que
coincide con la versión que el proyecto ya usa. Es suerte, no diseño.

---

## 8. Agregar una capacidad

1. **Escribirla en la especificación primero.** Una capacidad nueva es superficie pública nueva; si no
   está en `contracts/agent-capabilities.md`, no se implementa (regla anti-vibe-coding).
2. Escribir el test antes: forma exacta de la salida, comportamiento sin base de datos, y un
   centinela que verifique que no se filtre nada privado.
3. Declararla en `capabilities.ts` con `z.strictObject` y una descripción literal.
4. Agregarla a `capabilityDescriptors`. El endpoint aparece solo; el slug se deriva del nombre.
5. Copiarla en `TOOLS` de `webmcp.tsx`. El test de equivalencia dice exactamente qué falta.
6. Nombrarla en `/llms.txt`, que es donde un agente que lee texto se entera de que existe.

Y si la capacidad muta algo: no se agrega. Se abre la discusión de si el proyecto necesita una
primitiva de confirmación humana, y esa discusión termina en un ADR, no en un commit.

## Documentos relacionados

| Documento | Qué agrega |
|---|---|
| [`architecture.md`](./architecture.md) | Las cuatro capas y las cuatro puertas en contexto |
| [`security.md`](./security.md) | RLS, las cuatro fronteras, cabeceras |
| [`seo.md`](./seo.md) | `/llms.txt` y descubrimiento por texto |
| [`adr/008-webmcp.md`](./adr/008-webmcp.md) | Por qué un archivo aislado y sólo lectura |
| [`adr/009-mcp-futuro.md`](./adr/009-mcp-futuro.md) | Por qué la frontera sí y el servidor no |
| [`../specs/001-sitio-publico-campana/contracts/agent-capabilities.md`](../specs/001-sitio-publico-campana/contracts/agent-capabilities.md) | El contrato: forma exacta de cada salida |
| [`../specs/001-sitio-publico-campana/threat-model.md`](../specs/001-sitio-publico-campana/threat-model.md) | Amenazas A1–A6 |
