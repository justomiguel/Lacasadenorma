# ADR-011 · No habilitar `cacheComponents` en esta versión

**Estado**: Aceptada · **Fecha**: 2026-09-09

## Contexto

Next 16 unificó `experimental.dynamicIO`, `experimental.useCache` y `experimental.ppr` en una sola
opción de nivel superior: `cacheComponents`. Con ella se habilita Partial Prerendering por defecto y
la directiva `"use cache"`, que permitiría servir la parte estática de una página al instante y
transmitir la parte dinámica.

Suena hecho a medida para este sitio. Se probó.

## Decisión

**No habilitarla en esta versión.**

## Motivo

Con `cacheComponents: true`, leer `params`, `searchParams`, `cookies()`, `headers()` o hacer un
`fetch` sin cachear **fuera de un `<Suspense>` es un error de build**, no una advertencia:

```
Error: Route "/dispatch/[slug]": Next.js encountered uncached or runtime data
during prerendering. `fetch(...)`, `cookies()`, `headers()`, `params`,
`searchParams`, or `connection()` accessed outside of `<Suspense>` prevents
the route from being prerendered...
```

La forma correcta obliga a estructurar cada página como un componente sincronizado que pasa las
promesas hacia abajo, más un hijo cacheado con `"use cache"` y un hijo dinámico dentro de
`<Suspense>`. Es una restricción arquitectónica sobre **cada** página.

El beneficio para este sitio es marginal: las páginas públicas son casi enteramente estáticas y
cambian cuando alguien publica algo, no por request. La revalidación por etiquetas cubre eso con una
fracción de la complejidad.

El orden de prioridad de la constitución resuelve el empate sin discusión: simplicidad (3) va antes
que sofisticación técnica (10).

## Alternativas consideradas

| Alternativa | Evaluación |
|---|---|
| Habilitarla ahora | Costo de complejidad en todas las páginas, beneficio no medido |
| Habilitarla sólo en `/transparencia` | La opción es global; no se activa por ruta |
| Revalidación por etiquetas (elegido) | Cubre el caso real: publicar un gasto invalida la página de transparencia |

## Consecuencias

- Se usa `revalidateTag(tag, 'max')` — con el segundo argumento, obligatorio desde Next 16 — y
  `updateTag` en Server Actions cuando hace falta leer lo recién escrito.
- Si en el futuro el TTFB resulta un problema medido, se reevalúa. La decisión queda registrada acá
  con su motivo para que la reevaluación empiece con contexto y no de cero.
- No se usan `experimental.dynamicIO`, `experimental.useCache`, `experimental.ppr` ni
  `experimental_ppr`: fueron **eliminados**, no renombrados. Código de la era Next 15 que los use no
  compila.
