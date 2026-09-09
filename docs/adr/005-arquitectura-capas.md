# ADR-005 · Cuatro capas con dependencias unidireccionales, y cinco patrones justificados

**Estado**: Aceptada · **Fecha**: 2026-09-09

## Contexto

El proyecto empieza siendo un sitio de nueve páginas y tiene que terminar siendo la plataforma de
una fundación, con cuatro consumidores de la misma lógica (UI, API, WebMCP, futuro servidor MCP).
Los dos fracasos previsibles son opuestos: un monolito donde la lógica de negocio vive dentro de
componentes de React, o una sobrearquitectura con microservicios y contenedores de inyección de
dependencias para un sitio que muestra montos.

## Decisión

Cuatro capas con dependencias en una sola dirección, materializadas en directorios y **verificadas
por el linter**, no por convención:

```
presentation (app/, components/) → application (src/application/) → domain (src/domain/)
                                                                          ↑
                              infrastructure (src/infrastructure/) ───────┘
persistence (supabase/migrations/, content/)
```

Reglas impuestas con `no-restricted-imports` de ESLint:

- `src/domain/` no importa React, Next, Supabase ni nada con I/O.
- `src/application/` no importa `src/infrastructure/`: depende de puertos.
- `app/` y `components/` no importan `src/infrastructure/supabase` directamente.

Cinco patrones, cada uno con un problema nombrado:

| Patrón | Problema que resuelve |
|---|---|
| **Repository** | Los tests de dominio y de casos de uso no pueden depender de una base de datos. Los puertos permiten repositorios en memoria en test y Supabase en producción, y son lo que hace posible que el sitio funcione sin base configurada (FR-034) |
| **Service Layer** (casos de uso) | Cuatro adaptadores necesitan la misma lógica con la misma autorización. Sin esta capa se duplicaría, y la divergencia entre "el botón" y "la herramienta del agente" es la vulnerabilidad que la especificación de WebMCP nombra |
| **Adapter** | Aísla la inestabilidad de WebMCP (dos renombres con ruptura en 2026) en un archivo desechable |
| **Strategy** | Cada método de aporte tiene datos e instrucciones distintas y se renderiza con un contrato común, lo que permite agregar Mercado Pago o Stripe sin tocar la UI (FR-008) |
| **Value Object** (`Money`, `Percentage`) | Elimina por construcción la clase de bugs de floats y de sumar pesos con dólares |

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Lógica dentro de los componentes | Imposible reutilizar en la API y en WebMCP sin duplicar autorización |
| Monorepo con un paquete por capa | Agrega herramientas y tiempo de build sin resolver ningún problema actual |
| Contenedor de inyección de dependencias | Para tres repositorios, pasar el puerto por argumento es más simple y más legible |
| Factory Pattern | No hay familias de objetos que justifiquen la indirección. Agregarlo sería ceremonial, y la constitución lo prohíbe |
| CQRS / Event Sourcing | El sistema tiene decenas de registros. Sería arquitectura para un problema que no existe |

## Consecuencias

**Buenas.** El dominio se testea sin infraestructura. El sitio funciona sin credenciales porque los
puertos permiten un repositorio basado en el contenido versionado. Una migración futura de framework
toca dos capas, no cuatro.

**Malas y aceptadas.**

- Hay más indirección de la que un sitio de nueve páginas necesitaría hoy. Es una apuesta deliberada
  al crecimiento hacia la Fundación, y está declarada como tal.
- La regla de dependencias tiene que estar en el linter o se degrada en semanas. Por eso es
  configuración, no documentación.
- Existe algo de mapeo entre filas de la base y entidades del dominio. Se acepta: es lo que permite
  que el dominio no sepa que Supabase existe.
