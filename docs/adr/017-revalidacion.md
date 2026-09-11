# ADR-017 · Revalidación: ISR de cinco minutos más invalidación explícita al publicar

**Estado**: Aceptada · **Fecha**: 2026-09-09

## Contexto

Las seis páginas públicas que leen la base —home, aportes, reconstrucción, transparencia, novedades y
cada novedad— no usan ninguna API dinámica: la lectura pública se hace con el cliente **sin sesión**
(ver `src/infrastructure/data-layer.ts`), justamente para que la respuesta sea igual para todo el
mundo y se pueda cachear.

La consecuencia no es obvia y es grave: sin ninguna instrucción de revalidación, Next las prerenderiza
**durante el build** y las sirve así para siempre. Publicar un gasto desde el backoffice no cambiaría
nada en el sitio hasta el próximo despliegue. Sería el peor resultado posible: la mitad del proyecto
es una página de transparencia que se actualiza, y estaría congelada sin que nada falle.

`cacheComponents` está deshabilitado (ADR-011), así que `"use cache"` y `cacheTag` no están
disponibles y la revalidación por etiquetas que ese ADR anticipaba no se puede escribir tal cual.

## Decisión

**Dos mecanismos, uno como piso y otro como techo.**

1. **`export const revalidate = 300` en cada página que lee la base.** Es el piso: pase lo que pase,
   ninguna cifra publicada tiene más de cinco minutos de atraso. Cubre el caso de un cambio hecho
   directamente en la base —una corrección desde el panel de Supabase, una migración de datos— que
   el backoffice no puede saber que ocurrió.

2. **`revalidatePath` en toda acción del backoffice que cambie algo público.** Es el techo:
   publicar un avance o registrar un gasto invalida las páginas afectadas de inmediato, así que
   quien publica ve el resultado al recargar y puede compartir el enlace en el momento. Cada acción
   declara qué rutas toca; no hay una invalidación global.

El `sitemap.xml` lleva la misma revalidación, porque una novedad nueva tiene que aparecer ahí sin
esperar un despliegue.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Sólo `revalidatePath` desde el backoffice | Un cambio hecho fuera del backoffice no se vería nunca. Y el día que una acción se olvide de declarar una ruta, el síntoma es una cifra vieja en la página más importante del sitio |
| Sólo ISR, sin invalidación explícita | Publicar un avance y no verlo hasta cinco minutos después hace que quien publica dude de si guardó. Ese titubeo es exactamente lo que hace que la transparencia se deje de actualizar (SC-009) |
| `export const dynamic = "force-dynamic"` | Una consulta a la base por visita, en la página que va a recibir un pico de tráfico desde WhatsApp. Es pagar en el peor momento posible por una frescura que nadie pidió |
| Habilitar `cacheComponents` para usar `cacheTag` | Reabre la decisión del ADR-011: obliga a reestructurar cada página alrededor de `<Suspense>` para un beneficio no medido |
| Un `fetch` propio con `next: { tags }` inyectado en `supabase-js` | Se puede: el cliente acepta un `fetch` personalizado. Pero significa que el caché de cada consulta depende de una capa de infraestructura que nadie ve al leer la página, y que un `select` nuevo hereda un caché que quizá no le corresponde. Cinco minutos de atraso máximo no justifican esa clase de magia |

## Consecuencias

**Buenas.**

- El sitio sirve HTML estático en el pico de difusión, que es cuando importa (SC-004).
- Una cifra publicada tiene una antigüedad máxima conocida y escrita. La conciliación bancaria ya se
  muestra con su fecha, así que la frescura del dato es visible para quien lee.

**Malas y aceptadas.**

- Cinco minutos es un número elegido, no medido. Está en un solo lugar por página y se puede bajar.
- `revalidatePath` invalida por ruta, no por dato: publicar un gasto revalida toda la página de
  transparencia y no sólo el libro. A esta escala es irrelevante.
- Cada acción nueva del backoffice tiene que declarar qué rutas públicas toca. Es una lista que se
  puede quedar corta, y el ISR de cinco minutos existe precisamente para que quedarse corto sea un
  atraso y no un error permanente.
