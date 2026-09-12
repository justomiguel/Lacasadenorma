# Investigación: campañas reales de reconstrucción, colectas vecinales y legados

**Fecha de verificación:** 2026-09-12 · **Alcance:** sitios y campañas **reales** de familias que
perdieron su casa en un incendio, colectas vecinales post-incendio en la Argentina, fondos memoriales,
y proyectos que después se volvieron organizaciones.

Ninguna referencia de acá es una plantilla, un artículo de «10 mejores prácticas» ni un ejemplo de
portfolio de agencia. Son campañas que existieron, con su URL y su fecha. No se copia ninguna.

**Honestidad sobre el orden de los hechos:** este documento se escribió **después** de implementar
[ADR-024](../adr/024-tercera-direccion-visual.md), no antes, y eso contradice el principio I de la
constitución. Se deja anotado en lugar de disimularlo. Lo que sigue es entonces una verificación contra
el mundo real, no la fuente de la decisión: al final está la tabla de qué confirmó, qué habría cambiado
y qué queda abierto.

---

## 1. Las cinco referencias principales

### 1.1 Watt Family Rebuild — la única que es un sitio propio

<http://rebuild.watt.ws/> · Marshall Fire, Colorado, 30 de diciembre de 2021

Es la referencia más cercana a este proyecto, porque es la única que **no** es una página dentro de una
plataforma: es el dominio de la familia, con su bitácora. Lo que hace, en orden de importancia:

| Qué hace | Cómo |
|---|---|
| Abre con el hecho, fechado y en una sola oración | «On December 30, 2021, our house and all of our belongings burned down in the Marshall Fire» |
| Agradece **antes** de pedir | El primer bloque después del hecho es «Thank you for supporting us» |
| Junta todos los canales en un lugar | Álbum de fotos, fondo comunitario, Venmo, lista de deseos, GoFundMe |
| Cuenta la obra en orden inverso, con vocabulario de obra | «Los footers están colados» · «La losa del sótano está colada, el agua y la cloaca están puestas» · «¡Finalmente tenemos el permiso!» |
| No adorna el tiempo muerto | Hay una entrada que dice sólo «Hace mucho, pero pronto vamos a pedir el permiso de construcción» |
| Deja lugar a lo cotidiano | «Extraño mi Target», sobre un local cerrado del barrio |

Lo que hay que mirar con cuidado: la entrada **«Before and After»**, que publica «la última foto que
saqué de nuestra casa antes de que se incendiara, y la primera que saqué después». Es potentísima, y
está **abajo**, en su lugar cronológico, no en la apertura. La apertura es una oración de texto. Esa
distinción es exactamente la que `ux.md` §1 fija para este sitio y la que ADR-024 mantuvo.

### 1.2 Puerto Patriada y Epuyén — la colecta vecinal que publica las facturas

<https://www.infochucao.com/la-ayuda-era-para-ayer-jovenes-de-puerto-patriada-organizan-colectas-y-viviendas-ante-la-ausencia-estatal/>
y <https://www.infochucao.com/solidaridad-en-puerto-patriada-vecinos-levantan-la-casa-de-lolo-tras-el-incendio/> ·
Chubut, incendio del 5 de enero

Dos jóvenes, Elián Aguilera y Germán Navarro, abrieron una colecta por redes con un alias
(`patriada.ranch`) y juntaron más de 13 millones de pesos. Con eso compraron grupos electrógenos,
motobombas, mangueras, alimentos y herramientas, y levantaron la primera casa.

Lo que importa acá es la doctrina de rendición de cuentas, en palabras de los organizadores:

> «Tomamos la decisión desde un principio de tener todo transparente, pidiendo los remitos, la factura,
> todo lo que corresponde y después los movimientos de la cuenta que se solicitan.»

> «El dinero de todos ustedes, lo único que nosotros hacemos es **administrarlo**.»

Esa segunda frase es la definición correcta del rol de quien recibe una colecta y no es una
organización. No dice «nuestro fondo»: dice que administra plata ajena.

### 1.3 AcercAR, El Bolsón — la campaña partida en dos momentos

<https://www.asociacioncivilacercar.org/wp-content/uploads/2025/11/AcercAR-Informe-donaciones-incendio-confluencia-2025-1.pdf> ·
incendio de Confluencia, 2025

Una asociación civil ya existente puso su estructura al servicio de la emergencia y después publicó un
**informe de donaciones** en PDF, cuyo objetivo declarado es «rendición de cuentas y agradecimiento».
Total recaudado: **$21.547.426,92**.

El hallazgo estructural es que la campaña se dividió explícitamente en dos, con dos nombres distintos:

1. **EMERGENCIA**: «Apoyo a El Bolsón en la emergencia por los incendios»
2. **RECONSTRUCCIÓN**: «Apoya a las familias de El Bolsón en la reconstrucción después del incendio»

No las mezclaron ni cuando el dinero entraba a la misma cuenta. Es la validación externa de lo que
`PASO 4` pide y ADR-024 implementó: dos momentos, dos páginas, dos maneras de pedir.

El informe detalla además el trabajo administrativo real —organización de facturas, pedido de
presupuestos, traslado de lo comprado, nafta para las motosierras—, que es el tipo de detalle que hace
creíble una rendición y que ninguna cifra redonda logra.

### 1.4 Angélica y Mauro, Bariloche — la lista de necesidades que cambia

<https://www.anbariloche.com.ar/noticias/2026/09/09/116591-volver-a-empezar-desde-las-cenizas-la-urgente-campana-para-reconstruir-la-casa-de-angelica-y-su-hijo-mauro> ·
9 de septiembre de 2026, dos días después del incendio de esta casa

Una casa de madera destruida por completo, una mujer con quemaduras, el hijo sin nada. La campaña la
llevan vecinos y allegados, con un alias y un teléfono.

Dos cosas que hace bien y que casi nadie hace:

- **Dice qué ya no hace falta.** «La demanda de indumentaria ha sido cubierta, por lo que **ya no se
  recibe ropa**.» La prioridad pasó a materiales de construcción: clavos, tornillos, herramientas.
  Una necesidad satisfecha se retira en lugar de quedar acumulando donaciones que ya sobran.
- **Nombra al titular de la cuenta y su vínculo.** «Alias `Natalia2129`, registrado a nombre de Natalia
  Belén Barrientos Ampuero», y aclara que es la nuera de Angélica y la encargada de recibir mensajes.

Lo mismo hace la colecta de Villa Italia, Tandil
(<https://www.eleco.com.ar/la-ciudad/continua-la-campana-solidaria-para-ayudar-a-la-familia-que-perdio-su-casa-en-el-incendio-de-villa-italia>):
publica el alias `ayudacolectivatandil` «correspondiente a una cuenta a nombre de Maximiliano Daniel
Rebainera, propietario de la vivienda afectada». Y pide una cifra concreta y chica: «Estamos recurriendo
a cada uno de los tandilenses para que colaboren con $1.000 cada uno».

### 1.5 Construir Milagros, San Fernando — el caso casi idéntico a éste

<https://www.quepasaweb.com.ar/una-campana-solidaria-busca-reconstruir-una-casa-en-san-fernando-donde-una-mujer-murio-en-un-incendio-el-ano-pasado/> ·
incendio del 26 de noviembre de 2023, campaña a un año

Es el paralelo más exacto que encontré: un incendio de madrugada en una casa, una mujer —Carolina
Ramos— que muere, la familia dispersa entre casas de parientes, y una campaña para reconstruir **la
misma casa** en su memoria. La impulsa Milagros, su hija de 21 años.

Y acá está la decisión que este proyecto debería mirar de frente: **Milagros no fundó nada.** Lanzó
«Construir Milagros» **junto a la Fundación Impulso y Encuentro**, una ONG que existe desde 2019 y que
aporta la personería, la convocatoria de voluntarios y las jornadas de reconstrucción. La campaña tiene
nombre propio y respaldo institucional prestado.

---

## 2. Cuánto tarda de verdad un legado en existir

`PASO 4` afirma que la fundación no existe todavía y que no puede presentarse como constituida. Las
fechas de los legados reales que sí llegaron a constituirse respaldan eso mejor que cualquier argumento:

| Legado | Muerte | Constitución | Distancia |
|---|---|---|---|
| [Fundación Sergio Villar](https://www.entrenosdigital.com/agra-orzan/xentes-da-agra/fundacion-sergio-villar-legado-joven-mucha-luz/20250619120351019255.html) | 1 de abril de 2023 | marzo de 2024 | ~11 meses |
| [Fundación Marcelino Oliver](https://www.fundacionmarcelinooliver.org/el-perdon/) | 20 de noviembre de 2013 | 2017 | ~4 años |
| [Salud y Justicia Sobrevivientes ABC](https://semmexico.mx/sobrevivientes-de-la-guarderia-abc-de-la-tragedia-a-la-labor-como-promotores-de-conciencia/) | 5 de junio de 2009 | reuniones primero, movimiento después | años |
| [Casa Newenche](https://www.latribuna.cl/cronica-ciudadana/2026/01/22/espacio-comunitario-en-honor-a-maria-jesus-se-une-a-red-de-apoyo-solidario-en-los-angeles.html) | 19 de octubre de 2023 | espacio comunitario, no fundación | — |

El incendio de esta casa fue **el 7 de septiembre**. Estamos a cinco días. Ninguno de estos legados
existía a los cinco días, y el de la Guardería ABC empezó siendo «reuniones entre familias para
mantenerse unidas», que es un nombre honesto para lo que hay hoy acá.

Casa Newenche merece una nota aparte: en honor a María Jesús Troncoso no se creó una fundación sino
**un espacio comunitario**, que después terminó siendo centro de acopio para damnificados de otros
incendios. Un legado no está obligado a tomar la forma de una persona jurídica para ser real.

---

## 3. Cómo se dice «todavía no somos una organización»

Tres campañas que lo dicen de frente, con la redacción textual:

| Campaña | Cómo lo dice |
|---|---|
| [Kalalau Guardians](https://kalalauguardians.org/support/) | «No somos todavía una organización 501(c)(3). Los aportes en esta etapa son regalos de apoyo y no son deducibles. **Vamos a decirlo con claridad, acá y en todos lados, el día que eso cambie.**» Y: «La estructura legal va a seguir al compromiso demostrado» |
| [Stronger Than Silence](https://www.crowdfunder.co.uk/p/stronger-than-silence-foundation) | «**Importante: Stronger Than Silence Foundation no es todavía una organización benéfica registrada.**» Recauda £25.000 explícitamente *para registrarse* |
| [The Rad Foundation](https://theradfoundation.org/about/) | Publica su número de sociedad y aclara: «Si bien no somos todavía una entidad benéfica registrada, llegar a serlo es parte de nuestra visión de largo plazo» |

Y la guía de <https://grassrootsdigital.org/you-dont-need-an-ngo-to-start-fundraising/> da la regla
operativa: **«No finjas ser una ONG. No uses lenguaje de sonido oficial que genere confusión.»** La
fórmula que propone es «somos una iniciativa comunitaria, todavía no una ONG registrada», seguida
inmediatamente de cómo se maneja la plata.

## 4. Contar la historia sin explotar la tragedia

Tres fuentes de ética de la narración, coincidentes en lo esencial:

- <https://bradyware.com/ethical-nonprofit-storytelling/>
- <https://lampkinfoundation.org/insights/nonprofit-leadership/ethical-nonprofit-storytelling/>
- <https://www.truesense.com/ethical-storytelling-in-fundraising>

Lo que sirve, condensado y sin diluir:

| Principio | Frase que lo fija |
|---|---|
| El trauma no es evidencia | «**Trauma is not proof.**» Incluir un detalle sensible sólo si la persona eligió compartirlo sabiendo que sería público |
| Mostrar quién ya está actuando | «Show community leadership: **lo que la gente ya está haciendo, construyendo y exigiendo**» |
| Aclarar el rol propio | El proyecto acompaña y consigue recursos; **no** rescata |
| Reconocer el dolor sin volverlo identidad | «Reconoce la dificultad sin convertir la dificultad en identidad. Reconoce la vulnerabilidad sin quitar la fuerza» |
| Especificidad antes que espectáculo | Detalles reales sobre restricciones y resultados, sin exagerar |
| La vara ética | «No es si hay recaudación junto al relato, sino **si se sacrificó la dignidad de alguien para que el pedido fuera emocionalmente más eficaz**» |

De todos, el que tuvo consecuencia directa en el código es el segundo. La home mostraba la pérdida —la
banda oscura— y no mostraba a los vecinos con la pala, que estaban publicados pero en una página
interior. Eso es exactamente el desbalance que estas tres fuentes describen. La sección «el trabajo ya
empezó» de ADR-024 §4 existe por esa razón, y ahora tiene respaldo externo además del argumento propio.

Sobre fondos memoriales en particular,
<https://farewell.live/balancing-transparency-and-protection-when-sharing-estate-or> agrega dos cosas
concretas: **un solo enlace canónico**, repetido siempre igual, y mantener los detalles médicos o
sensibles **fuera** de la página pública.

---

## 5. Qué se hace con todo esto

### Confirmó decisiones que ya estaban tomadas

| Hallazgo | Dónde ya estaba |
|---|---|
| Dos momentos separados y nombrados (AcercAR) | ADR-024 §4 y `PASO 4`: la casa hoy, el legado como intención |
| Abrir con el hecho en prosa y guardar el antes/después para su lugar cronológico (Watt) | `ux.md` §1 y ADR-024 §5 |
| Mostrar a la comunidad trabajando, no sólo la pérdida | La sección «el trabajo ya empezó», ADR-024 §4 |
| Decir «todavía no existe» sin eufemismos (Kalalau, Stronger Than Silence) | `/legado` y la pregunta 9, que ya dicen «no tiene personería jurídica ni estatuto, y no vamos a decir que los tiene hasta que los tenga» |
| Rendición con comprobantes, no con totales redondos (Puerto Patriada, AcercAR) | `/transparencia`: total recibido, gastado, saldo, y cada gasto con fecha, concepto y si tiene comprobante |
| Nombrar al titular de la cuenta (Angélica, Villa Italia) | Ya soportado: el nombre del titular es un campo de `payment-methods.ts`, cargado por quien administra, con `copyable` en falso — «un CBU se copia; el nombre del titular se lee». No hay nada que inventar en el repositorio |
| Un solo enlace canónico | Un dominio, una página de aportes, y `/compartir` con el texto ya escrito |
| Vocabulario de obra en las actualizaciones (Watt) | `/novedades` y el ensayo fotográfico de `/reconstruccion` |

### Habría cambiado una cosa, y llegó igual

La bajada de la apertura decía «inhaló mucho humo y está en tratamiento». Se acortó a «se salvó y está
en tratamiento» por una razón de píxeles, y resulta que también es la decisión correcta por una razón
de ética: es un detalle médico de una persona viva, y `farewell.live` recomienda mantener eso fuera de
la página pública. El detalle sigue en `/que-paso`, que es donde se cuenta lo que pasó, y ya no está en
lo primero que alguien lee. Buen resultado, mal método: llegó por el pliegue y no por el razonamiento.

### Queda abierto, y no lo decide este repositorio

Dos cosas que las referencias hacen y que **no** se implementan, porque implementarlas sería inventar:

1. **Retirar una necesidad cuando está cubierta**, como hizo la campaña de Angélica con la ropa. Hoy
   este sitio no publica lista de necesidades en especie, así que no aplica. Si algún día se publica,
   la lección está acá: la lista tiene que poder decir «esto ya no hace falta».
2. **Apoyarse en una organización que ya exista**, como hizo Milagros con la Fundación Impulso y
   Encuentro, en lugar de esperar a constituir una. Es la alternativa más sólida que encontró esta
   investigación para el legado, y es una decisión **de la familia**, no de diseño. Se anota como
   opción documentada; no se anuncia, no se insinúa en la página, y `/legado` sigue diciendo lo que
   dice hoy.

## Documentos relacionados

| Documento | Qué agrega |
|---|---|
| [`../adr/024-tercera-direccion-visual.md`](../adr/024-tercera-direccion-visual.md) | La decisión que esta investigación verifica a posteriori |
| [`../content-guide.md`](../content-guide.md) | Qué está verificado y qué falta, que es el límite de lo publicable |
| [`../../specs/001-sitio-publico-campana/ux.md`](../../specs/001-sitio-publico-campana/ux.md) | §1, el orden del relato y la prohibición de abrir con la pérdida |
