# ADR-006 · Aportes por transferencia registrados manualmente, con puerto abierto a medios electrónicos

**Estado**: Aceptada · **Fecha**: 2026-09-09

## Contexto

Hay que poder recibir ayuda desde Argentina, Chile y Estados Unidos. Procesar pagos en el sitio
implicaría integrar una pasarela, cumplir requisitos de la plataforma, manejar reembolsos y
disputas, y asumir comisiones sobre cada aporte. El proyecto lo administra una familia.

## Decisión

En esta versión el sitio **no cobra**. Presenta los datos de transferencia por país, con cada dato
copiable individualmente, e informa qué hacer después. Los aportes se registran en el backoffice
después de conciliarlos con el banco.

El modelo trata los métodos de aporte como **datos** (`payment_methods` con `kind`, `country_code`,
`currency` y `fields` en `jsonb`), no como constantes en el código. Agregar Mercado Pago, Stripe o
PayPal es agregar un `kind` y su estrategia de renderizado, sin rediseñar nada.

Un método con `published_at` nulo **no se muestra**. Es la defensa contra publicar un CBU sin
verificar.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Mercado Pago desde el día uno | Comisión sobre cada aporte, más una integración y su mantenimiento, para un flujo que en Argentina la gente ya resuelve con un alias |
| Stripe | Para donaciones desde Estados Unidos tendría sentido; requiere entidad legal, que todavía no existe |
| Una plataforma de campañas (GoFundMe y similares) | Toma una comisión, se queda con la relación con quien aporta, y no permite construir la transparencia auditable que es el punto del proyecto |
| Columnas fijas por país en `payment_methods` | Cada país necesita campos distintos (CBU y alias en Argentina, RUT en Chile, routing number en Estados Unidos). Serían quince columnas nullables |
| Mostrar los datos bancarios sin verificar, con una advertencia | Es exactamente el fallo de mayor consecuencia posible: alguien transfiere al vacío |

## Consecuencias

**Buenas.** Cero comisiones: llega el 100% de cada aporte. Cero superficie de ataque de pagos. Cero
datos de tarjeta que proteger. Y la conciliación manual, que parece una desventaja, es lo que
produce el dato conciliado con fecha que sostiene la transparencia.

**Malas y aceptadas.**

- **Hay fricción**: quien quiere ayudar tiene que ir a su banco. Se compensa haciendo que copiar el
  dato sea de un toque y que las instrucciones sean cortas.
- **La conciliación es trabajo humano recurrente**, y si no se hace, la transparencia envejece. Es
  el riesgo más probable del proyecto (R1). Se mitiga con un backoffice usable desde el teléfono, la
  fecha de conciliación visible al público, y un runbook semanal.
- No hay comprobante automático para quien aporta. Aceptado: en esta versión no se recolectan datos
  de contacto de quien aporta, lo que además es la decisión correcta de privacidad.
- Los aportes desde el exterior tienen costos bancarios que el proyecto no controla. Las
  instrucciones lo dicen en lugar de ocultarlo.
