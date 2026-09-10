# Guía de contenido

Este documento sirve para dos cosas: saber **dónde vive cada texto** del sitio, y saber **cómo se
escribe** para que suene a este proyecto y no a una campaña genérica.

La segunda parte no es un asunto de estilo. Cuando alguien llega desde un mensaje de WhatsApp, decide
en menos de treinta segundos si esto es real. Una frase de folleto —"juntos podemos hacer la
diferencia"— es la forma más rápida de perder eso, porque es exactamente lo que dice una estafa.

---

## 1. Dónde vive cada cosa

Dos fuentes, divididas por frecuencia de cambio (ADR-007).

| Fuente | Qué | Cómo se edita | Quién |
|---|---|---|---|
| `content/*.json` | Prosa: historia, relato, textos de sección, preguntas, legales | Commit y pull request | Quien escribe, con revisión |
| Supabase, vía `/admin` | Cifras, aportes, gastos, comprobantes, hitos, novedades, fotos, cuentas, objetivos | Formulario en el backoffice | El equipo de la campaña |

La división responde a una observación simple: la historia de Norma se escribe una vez y se corrige de
vez en cuando; el monto recaudado cambia cada semana. Un texto sobre una persona fallecida merece pasar
por revisión. Un monto no puede esperar un despliegue.

### Los archivos

| Archivo | Alimenta | Notas |
|---|---|---|
| `site.json` | Nombre, bajada, lugar, descripciones, estado | `shortDescription` es la meta description: máximo 160 caracteres, y el esquema lo exige |
| `norma.json` | `/norma` y los datos estructurados | `bornOn` y `diedOn` son fechas ISO o `null` |
| `que-paso.json` | `/que-paso` | Tiene un cierre obligatorio, `needNow` |
| `reconstruccion.json` | `/reconstruccion` | `scope` es la lista de trabajos, **sin montos** |
| `ayudar.json` | `/ayudar` | `afterTransfer`: qué pasa después de transferir |
| `transparencia.json` | `/transparencia` | `method`: cómo se lleva la cuenta |
| `legado.json` | `/legado` | Fundación Norma como intención, no como organización |
| `riacho-conecta.json` | `/riacho-conecta` | `topics` son intenciones declaradas, no un programa con fechas |
| `preguntas.json` | Las nueve preguntas de la home y el `FAQPage` | Mínimo nueve, y el esquema lo exige |
| `legales.json` | `/legales/privacidad` y `/legales/terminos` | `updatedOn` se cambia cuando cambia el texto |

Son **JSON y no TypeScript** a propósito: los puede editar alguien que no programa sin riesgo de
romper la compilación, y el esquema de Zod le da el mismo control de errores que daría el compilador.

### Cómo se escribe la prosa

Cada texto largo es un **array de cadenas**, y cada elemento es un `<p>`. No hay HTML, no hay
Markdown, no hay negritas.

```json
"paragraphs": [
  "El relevamiento de la obra lo está haciendo la familia con gente del pueblo.",
  "Mientras un rubro no esté cotizado, se muestra sin monto."
]
```

La limitación es deliberada. Sin HTML en el contenido no hay forma de inyectar un `<script>` desde un
archivo de contenido, y la jerarquía tipográfica la decide el diseño en lugar de improvisarse texto por
texto. Si un párrafo necesita un enlace, el enlace se pone en el componente, donde se ve.

### La validación corre al importar

`content/index.ts` valida cada archivo con su esquema **en el momento de importarlo**. Un campo
faltante o mal escrito no llega a producción: rompe el build con el archivo, el campo y qué se
esperaba.

```
El contenido de content/norma.json no cumple su esquema:
  · summary: Too small: expected string to have >=1 characters
```

---

## 2. La regla del dato ausente

**Un campo sin dato verificado es `null` o una lista vacía, nunca un texto de relleno.** La interfaz
omite la sección.

Es la regla más importante del proyecto. Un sitio que pide plata y muestra un CBU de ejemplo o un monto
inventado pierde lo único que tiene. `npm run check:placeholders` recorre todos los valores de texto de
`content/` y todos los literales de cadena de `app/` y `components/` buscando `TODO`, `FIXME`, `TBD`,
`PENDIENTE`, `PLACEHOLDER`, `lorem ipsum`, secuencias de cuatro `X` o más y secuencias de ceros con
guión. Corre en `npm run verify` y en CI. Un `TODO` en un comentario es normal; un `TODO` en el texto
que lee una persona es un fallo de producto.

Cuando el hueco es una **foto**, el sitio no lo esconde: reserva el espacio con su proporción final y
dice qué va a ir ahí. El espacio reservado tiene dos ventajas sobre no poner nada: cuando llegue la
foto no habrá salto de layout, y mientras tanto la ausencia se lee como una espera y no como un
descuido.

---

## 3. Lo que falta hoy

Esta es la lista que ADR-007 promete. Está ordenada por lo que más cambia la página.

### Fotografías

Ningún archivo de imagen está en el proyecto. Los cinco espacios reservados, con el texto que se ve
hoy en pantalla:

| Dónde | Qué va | Proporción |
|---|---|---|
| Home, portada | "Acá va un retrato de Norma. Su familia está eligiendo la fotografía." | Vertical |
| Home, sección de la historia | "Acá va una foto de Norma trabajando en la radio." | Horizontal |
| `/norma` | "Acá va el retrato de Norma que elija la familia." | Vertical |
| `/norma` | "Acá va una foto de Norma en la radio de Riacho He Hé." | Horizontal |
| `/legado` | "Acá va una foto de Norma en la radio, la que explica de dónde viene todo esto." | Vertical |
| `/reconstruccion` | "Acá van las fotos del avance de la obra, con su fecha." | Horizontal |

Las fotos de Norma las elige **la familia**, y esa decisión no la toma nadie más. Las del avance de la
obra se suben desde el backoffice junto con cada novedad, así que aparecen fechadas y sin
despliegue.

Cuando lleguen: se suben a Supabase Storage desde `/admin`, con su texto alternativo. El alt describe
lo que se ve para alguien que no puede verlo, no repite el epígrafe.

### Texto

| Campo | Estado | Quién lo completa |
|---|---|---|
| `norma.bornOn`, `norma.diedOn` | `null`. **No se estiman ni se sacan de una noticia** | La familia, si decide publicarlas |
| `reconstruccion.scope` | Lista vacía: el relevamiento de la obra está en curso | La familia con gente del pueblo, a medida que cada parte se cotiza |
| `transparencia.paragraphs` | Lista vacía. El método sí está escrito; falta la introducción | Quien escribe |
| `preguntas[3].href` | `null`: "¿Dónde queda Riacho He Hé?" se responde en la home y no tiene página propia | Nadie, hasta que exista esa página |
| Dirección de contacto en `/legales/privacidad` | No publicada, y la página lo dice | El equipo, cuando haya un canal que alguien atienda |

Que `scope` esté vacío no rompe la página: `/reconstruccion` explica que el relevamiento está en curso
y que un rubro sin cotizar se muestra sin monto. Eso es más honesto que una lista inventada, y es
literalmente lo que el texto de la página promete.

### Datos operativos

Sin base de datos, el sitio se ve completo y no muestra ninguna cifra: en su lugar dice por qué no la
muestra (FR-034). Faltan, y se cargan desde `/admin`: el objetivo de la campaña, las cuentas de aporte
de los tres países, los aportes conciliados, los gastos con sus comprobantes, los hitos y las
novedades.

**Las cuentas de aporte son el dato más delicado del proyecto.** Un CBU mal tipeado manda el dinero de
otra persona a un desconocido. Se cargan una vez, se verifican contra el homebanking, y el backoffice
las marca como verificadas antes de publicarlas.

---

## 4. Cómo se escribe

### El tono

Humano, concreto, cercano, argentino, digno, esperanzado. Nunca melodramático, nunca lastimero.

La distinción entre las dos últimas frases es la que hay que tener presente todo el tiempo. La
diferencia entre dignidad y lástima no está en los hechos: está en para qué se cuentan. Contar que la
casa se incendió porque quien va a colaborar necesita saber qué pasó es dignidad. Contarlo con
adjetivos para que se conmueva es lástima, y la lástima consigue una donación y pierde a una persona.

Norma fue una de las primeras comunicadoras sociales de Riacho He Hé. Trabajó. Eso se cuenta con
respeto y en pasado, no con solemnidad.

### Prohibido

Estas frases, y todo lo que suene a ellas:

> empoderando comunidades · construyendo un futuro mejor · juntos podemos · haciendo la diferencia ·
> transformando vidas · sumate al cambio · tu ayuda cuenta

No están prohibidas por gastadas: están prohibidas porque **no dicen nada verificable**. "Juntos
podemos" no informa. "Faltan las chapas del techo" sí. Y quien está decidiendo si transferir plata a
gente que no conoce necesita lo segundo.

### Concreto en lugar de abstracto

| En lugar de | Escribir |
|---|---|
| "Ayudanos a reconstruir sueños" | "Faltan las chapas del techo y la instalación eléctrica" |
| "Tu aporte transforma vidas" | "Con lo que entró se compraron los ladrillos. El comprobante está publicado" |
| "Gracias por acompañarnos en este camino" | "Gracias. La próxima actualización va a estar cuando se termine el contrapiso" |
| "Estamos comprometidos con la transparencia" | "Cada gasto tiene fecha y comprobante. Podés revisarlos" |

La prueba práctica: si la oración podría estar en la página de cualquier otra campaña sin cambiar una
palabra, no sirve. Si sólo puede estar en esta, sirve.

### Castellano rioplatense

Voseo (`podés`, `sabés`, `mirá`), y de vos, no de usted. Vocabulario argentino donde corresponde:
*corralón*, *chapas*, *contrapiso*, *homebanking*, *CBU*, *alias*. Sin españolismos y sin neutro
latinoamericano de doblaje.

Los términos técnicos van en castellano cuando existe la palabra y en inglés cuando la traducción
suena peor de lo que ayuda. Se dice *homebanking* porque es lo que la gente dice.

### Longitud

Párrafos cortos, de dos a cuatro oraciones. La medida de línea está limitada a unos 68 caracteres por
diseño, así que un párrafo largo se ve como un bloque y, en un teléfono, como una pared.

Las bajadas (`lead`) son **una sola oración**. Si necesita dos, la segunda va al primer párrafo.

### Las nueve preguntas

Se responden en corto, en la home, con un enlace a la página que las desarrolla. La respuesta corta
tiene que servir sola: alguien que sólo lee eso tiene que quedarse con la respuesta, no con la
sensación de que hay que entrar a otra página.

Cada pregunta termina en signo de interrogación y hay un test que lo verifica. Parece trivial y no lo
es: los datos estructurados de `FAQPage` reproducen ese texto exactamente.

---

## 5. Novedades

Una novedad es lo único que se escribe seguido, y es lo que sostiene la confianza cuando la campaña
deja de ser noticia.

Se escriben desde `/admin`, con título, cuerpo y fotos, y se publican con fecha. Quedan como borrador
hasta que alguien las publica; un borrador no es visible ni indexable.

Qué hace buena a una novedad:

- **Un hecho, con su fecha.** "El 3 de septiembre se compraron las chapas."
- **Qué sigue.** Una línea. La pregunta que todos tienen es "¿y ahora?".
- **Sin balance emocional.** El agradecimiento va una vez, al principio de la campaña, no en cada
  actualización.
- **Sin cifras escritas a mano.** Los totales salen de la base y se calculan; escribir "ya juntamos
  $2.400.000" en el cuerpo de una novedad crea un número que no se actualiza nunca y que dentro de un
  mes va a contradecir a la página de transparencia.

Una novedad breve publicada a tiempo vale más que una larga que espera a que haya algo importante que
contar. El silencio, en una campaña de plata, se lee como que algo salió mal.

---

## 6. Antes de publicar

Un texto nuevo o corregido, en orden:

1. `npm run verify`. Valida los esquemas, corre los tests y busca marcadores de relleno.
2. Leerlo **en un teléfono**. La mayoría de la gente lo va a leer así, y un párrafo que en el monitor
   se ve bien puede ser una pared de 400 píxeles de alto en un celular.
3. Pasar la prueba de la frase intercambiable: ¿podría estar en cualquier otra campaña?
4. Si afirma un dato —una fecha, un monto, un nombre— verificar que sea cierto y esté verificado. Si no
   lo está, no va: va `null`.
5. Si el texto habla de lo que se recolecta, cotejarlo con [`privacy.md`](./privacy.md), que es el
   respaldo técnico de esa página.

## Documentos relacionados

| Documento | Qué agrega |
|---|---|
| [`adr/007-arquitectura-contenido.md`](./adr/007-arquitectura-contenido.md) | Por qué dos fuentes y no un CMS |
| [`architecture.md`](./architecture.md) | Cómo se lee el contenido y cómo se cachea |
| [`seo.md`](./seo.md) | Cómo este texto se convierte en metadatos y respuestas |
| [`privacy.md`](./privacy.md) | El respaldo de lo que dice la página de privacidad |
| [`runbook.md`](./runbook.md) | Cómo publicar una novedad y cargar una cuenta |
| [`../specs/001-sitio-publico-campana/ux.md`](../specs/001-sitio-publico-campana/ux.md) | Decisiones de diseño y jerarquía editorial |
