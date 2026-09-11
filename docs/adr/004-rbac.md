# ADR-004 · RBAC con tabla de roles más claim en el token

**Estado**: Aceptada · **Fecha**: 2026-09-09

## Contexto

Cuatro roles con permisos genuinamente distintos (FR-021): `owner` administra todo incluidas las
cuentas de aporte; `admin` registra plata; `editor` publica contenido pero no ve plata; `auditor` lee
todo incluidos comprobantes y no escribe nada.

Las policies RLS necesitan conocer el rol. Hay dos formas de que lo sepan, y elegir mal cuesta caro.

## Decisión

Las dos, con roles distintos:

1. **`user_roles`** es la fuente de verdad: administrable, auditable, con `granted_by` y
   `granted_at`.
2. **`custom_access_token_hook`** desnormaliza el rol a `app_metadata.user_role` en el JWT, para que
   las policies lean un claim en lugar de hacer un join por fila.

Las policies leen el claim como `((select auth.jwt()) -> 'app_metadata' ->> 'user_role')`, con el
subselect envolviendo **la llamada**, no la expresión.

Un helper `private.has_min_role(role)` implementa la jerarquía
`owner > admin > editor` y `auditor` como rama de sólo lectura.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Sólo tabla, sin claim | Cada policy haría un join a `user_roles` por fila evaluada. Es el patrón que `db advisors` marca como problema de performance |
| Sólo claim, sin tabla | No habría forma de administrar ni auditar quién otorgó qué |
| Rol en `user_metadata` | **Es editable por el usuario.** Cualquiera podría hacerse `owner`. Es una vulnerabilidad, no una alternativa |
| Roles nativos de Postgres por persona | Mezcla identidad de aplicación con identidad de base de datos y complica el aprovisionamiento sin dar nada |
| Un solo rol de administrador | Rompe el privilegio mínimo justo donde importa: quien publica una foto no necesita poder cambiar un CBU |

## Consecuencias

**Buenas.** Las policies son baratas y legibles. `editor` no puede ver aportes ni gastos, lo que
significa que si su cuenta se compromete, el daño posible es acotado. `auditor` permite que alguien
externo verifique sin poder alterar nada, que es exactamente lo que hace creíble la transparencia.

**Malas y aceptadas.**

- **Los claims son tan frescos como el último refresh del token**: un cambio de rol tarda hasta la
  rotación. Con cuatro personas es aceptable; está en el runbook, junto con la instrucción de forzar
  el cierre de sesión cuando se revoca un rol.
- La función del hook **necesita `set search_path = ''`** o `db advisors` la marca
  `function_search_path_mutable`. El ejemplo de la documentación oficial de Supabase lo omite.
- Crear la función no alcanza: hay que habilitar el hook en `config.toml` y en el panel del
  proyecto. Si no se hace, nadie tiene rol y el backoffice queda inutilizable de una forma
  desconcertante. Está como paso explícito en el runbook de despliegue.
- La jerarquía de roles vive en dos lugares (SQL y TypeScript). Se mitiga con tests pgTAP que
  cubren la matriz completa de rol × tabla × operación.
