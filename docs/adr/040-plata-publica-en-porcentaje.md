# ADR-040 · En público la plata se habla en porcentajes, y el 100% no se publica

**Estado**: Aceptada · **Fecha**: 2026-09-15

## Contexto

La spec original (FR-010, FR-011) pedía publicar montos: recibido, gastado, saldo, cada gasto con
su cifra. Después se rechazó la rendición pública de cifras —`/transparencia` quedó en el método,
sin totales— porque el objetivo de la obra no está cerrado y un número suelto, en una campaña que
pide plata, se lee como una meta.

El pedido que sigue es otro: **sí hablar de plata en el sitio**, pero nunca en pesos ni en dólares.
Hablar de cuánto representa cada cosa respecto del total conocido. **Lo que no se sabe es el
100%**: cuánto falta para terminar la casa, el objetivo de recaudación, el presupuesto completo.

Eso choca con dos tentaciones que el sitio ya tuvo:

1. Mostrar `$ X recaudados de un objetivo de $ Y` y una barra al 24%. Si Y no está verificado, el
   24% es una cifra falsa.
2. Callar la plata del todo. Quien aportó no puede ver si se usó, y un agente que pregunta el
   estado se queda sin respuesta pública (amenaza A5: el camino del agente no puede citar montos
   que la página no muestra).

El 100% que **sí** se conoce es otro: lo que ya llegó a la cuenta, conciliado. De esa plata se
puede decir qué parte se gastó y qué parte sigue, y de lo gastado se puede decir qué parte es cada
factura. Esos denominadores existen. El de la obra, no.

## Decisión

**El sitio público no publica montos. Publica porcentajes sobre totales ya conocidos.**

1. **El objetivo de la obra no es un dato público**, aunque esté cargado en el backoffice. No hay
   barra contra una meta. No hay «se recaudó el X% del objetivo». El 100% de la casa no se sabe, y
   el sitio lo dice.
2. **De lo que ya llegó**, se publica qué parte se usó y qué parte sigue en la cuenta. El
   denominador es el total recibido conciliado (`campaign_totals`), no el objetivo. Si no hay
   recibido, no hay porcentaje: se omite, no se pone un 0%.
3. **De lo ya gastado**, cada gasto y cada categoría se publican como parte de ese total. Fecha,
   concepto, categoría y comprobante siguen. El monto y la moneda no.
4. **Del presupuesto cotizado**, cada rubro se publica como parte de la suma de los rubros que ya
   tienen cotización. Un rubro sin cotizar aparece sin porcentaje. Esa suma **no** es el 100% de la
   obra.
5. **El backoffice sigue en montos.** No se puede asentar un gasto sin cifra. La compuerta es
   `formatMoney` vedado en la presentación pública (ESLint), no un comentario.
6. **Las capacidades para agentes devuelven los mismos porcentajes que la página**, nunca
   `*Minor`. Si el endpoint citara un peso que `/transparencia` no muestra, un agente estaría
   leyendo otra campaña (A5).

El libro interno no cambia: `bigint` + moneda, anulaciones, SC-007 sobre los montos. Lo que cambia
es **qué se afirma en la interfaz pública**.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Seguir sin cifras en `/transparencia` | El pedido es hablar de plata. Callar no le dice a quien aportó qué parte se usó |
| Publicar montos y además el porcentaje | El monto es lo que se pidió no mostrar. Un `$` al lado del `%` vuelve a afirmar una cifra absoluta |
| Inventar un 100% (objetivo, presupuesto completo, «la casa») | No está verificado. Un 24% de un total inventado es peor que no decir nada |
| Usar el `goal_amount_minor` del backoffice como 100% público | Está en la base para priorizar adentro. Publicarlo convertiría una cifra operativa en meta de campaña |
| Dejar los `*Minor` en las capacidades y sólo cambiar el `format()` | El JSON es lo que cita un agente. A5 no se arregla con la prosa |

## Consecuencias

**Buenas.** El sitio puede hablar de plata sin afirmar un total que no existe. Quien aportó ve
composición, no una meta. El agente y la página dicen lo mismo. El backoffice no pierde la cifra
con la que asienta.

**Malas y aceptadas.**

- **La ayuda total del proyecto sigue sin un número**, igual que en ADR-031: una parte está en
  pesos conciliados y otra en cosas del catálogo. Los porcentajes de esta decisión cubren sólo el
  libro.
- Un redondeo a entero puede hacer que las partes sumen 99 o 101. Es honesto: el sitio no inventa
  el último punto para que «cierre». El cierre aritmético exacto vive en el backoffice (SC-007).
- Quien espera ver «cuánto falta en pesos» no lo va a ver. El catálogo habla en unidades; el libro,
  en partes de lo ya conocido.
