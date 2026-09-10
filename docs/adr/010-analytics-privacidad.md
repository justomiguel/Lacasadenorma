# ADR-010 · Analítica sin cookies ni identificación personal

**Estado**: Aceptada · **Fecha**: 2026-09-09

## Contexto

Hay preguntas que importan para que la campaña funcione: cuánta gente llega, de dónde, cuántos tocan
"Ayudar", cuántos copian un dato bancario, cuántos comparten. Sin eso no se sabe si el problema es de
alcance o de conversión.

Y hay un contexto que condiciona la respuesta: el sitio habla de una persona que murió, lo visitan
sus vecinos y su familia, y su credibilidad es su único activo. Instalar los rastreadores habituales
sería incoherente con eso.

## Decisión

Eventos semánticos, sin cookies, sin identificadores persistentes, sin datos personales. Se registra
**qué pasó**, nunca **quién lo hizo**.

Eventos. Los nombres están en castellano, como el resto del proyecto (ADR-014): el nombre de un
evento se lee en un panel meses después, y conviene que se lea en el idioma en que se piensa el
proyecto.

La vista de página no está en la lista: la cuenta el script del proveedor, incluidas las
navegaciones del cliente. Emitirla también desde el sitio la contaría dos veces.

| Evento | Propiedades | Dónde se emite |
|---|---|---|
| `ayudar_click` | ubicación en la página | `components/campaign/help-cta.tsx` |
| `metodo_visto` | país del método | `components/campaign/donation-methods.tsx` |
| `dato_copiado` | país, tipo de campo (**nunca** el valor) | `components/campaign/donation-methods.tsx` |
| `compartir` | canal de destino, ruta | `components/campaign/share-block.tsx` |

La lista es exactamente esa, y la columna de la derecha existe para que se pueda verificar. Una
versión anterior de este ADR declaraba también `transparencia_vista` y `novedad_vista`: se quitaron
porque son vistas de página con otro nombre —el proveedor ya las separa por ruta— y porque nunca se
emitieron. Un evento declarado y no emitido es una afirmación falsa sobre lo que el sitio mide, y las
afirmaciones sobre privacidad son las que menos conviene tener desactualizadas.

La capa de analítica es un puerto (`Analytics`, en `src/domain/ports/analytics.ts`) con dos
implementaciones: una que no hace nada (por defecto, y en tests) y una que envía a un proveedor
respetuoso de la privacidad cuando está configurado. **Sin configuración, no se envía nada.**

### Cómo se conecta el proveedor

No se instala ningún SDK. El adaptador de navegador busca en `window` la función global que exponen
los scripts compatibles con Plausible —el mismo contrato que implementan Umami y varios otros— y la
llama si existe. El script sólo se inyecta cuando `NEXT_PUBLIC_ANALYTICS_SCRIPT_URL` y
`NEXT_PUBLIC_ANALYTICS_DOMAIN` están definidas las dos (`components/site/analytics.tsx`).

Hay un detalle que hace falta escribir porque se descubre tarde y de la peor manera: **la CSP y la
analítica están acopladas**. Con `script-src 'self'`, configurar las variables no alcanza —el
navegador bloquea el script y no llega un solo evento, sin que nada se vea roto—. `next.config.ts`
deriva el origen permitido de la misma variable que inyecta el script, así que las dos cosas no
pueden quedar desalineadas.

Es una decisión con dos consecuencias buenas y una mala, y las tres son deliberadas:

- Sin variable configurada no se carga ningún script de terceros, no se envía nada, y el sitio pesa
  lo mismo. Es el estado por defecto, incluido el de un clon nuevo.
- Cambiar de proveedor es cambiar una URL, no una dependencia del `package.json`.
- A cambio, no hay tipos del proveedor: el adaptador comprueba en tiempo de ejecución que la función
  global exista y tenga la forma esperada. Está encapsulado en un solo archivo.

`docs/privacy.md` y la página pública de privacidad documentan qué se recolecta, para qué y cuánto
se conserva.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Google Analytics 4 | Cookies, perfilado, transferencia de datos, y un banner de consentimiento que agrega fricción justo en la primera pantalla |
| Meta Pixel | Lo mismo, peor |
| Sin analítica | No se podría distinguir "nadie llega" de "llegan y no colaboran", que son problemas opuestos |
| Analítica propia sobre la base de datos | Escribir en la base en cada visita agrega latencia y un problema de escritura que no queremos en un pico de difusión |
| Guardar la dirección IP | Es dato personal. El país alcanza para todo lo que necesitamos saber |

## Consecuencias

**Buenas.** Sin banner de consentimiento, lo que significa una barrera menos en la primera pantalla y
una decisión de privacidad que se puede explicar en una línea. Los tests no necesitan mockear nada.
Si el proveedor desaparece, se cambia una implementación.

**Malas y aceptadas.**

- No hay embudos por persona ni cohortes. Se conocen totales, no recorridos individuales. Es
  suficiente para las decisiones que hay que tomar.
- No se puede atribuir un aporte a una campaña de difusión con precisión, porque el aporte ocurre en
  el banco, fuera del sitio. Se compensa con el evento de copiado como señal de intención.
- Hay que resistir la tentación de agregar "sólo un pixel". Queda como prohibición explícita en la
  constitución (principio de privacidad) y en este ADR.
