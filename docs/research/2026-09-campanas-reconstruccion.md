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

Pero lo mejor de este caso es una frase suya, que es la mejor línea de toda la investigación porque
hace algo que casi ninguna campaña hace: **le pone techo honesto a lo que el dinero puede reparar.**

> «Reconstruir la casa no me devuelve a mi mamá, pero a mí y a mi hermano nos devuelve la posibilidad
> de estar juntos como ella quería.»

No pide en nombre de la muerta: pide en nombre de una necesidad presente y concreta. Y separa las dos
cosas en la misma oración, lo que desactiva de raíz la sensación de que se está cobrando por un duelo.
El equivalente para este sitio existe y no está escrito: reconstruir la casa no devuelve a Norma, le
devuelve a su marido el lugar donde vivió. **No se agrega**, porque una frase así la escribe la
familia en primera persona o no se escribe — inventarla sería exactamente el tipo de cosa que el
`PASO 2` prohíbe. Queda anotada como la línea que vale pedirle a Justo Miguel.

---

## 2. Cuánto tarda de verdad un legado en existir

`PASO 4` afirma que la fundación no existe todavía y que no puede presentarse como constituida. Las
fechas de los legados reales que sí llegaron a constituirse respaldan eso mejor que cualquier argumento:

| Legado | Muerte | Constitución | Distancia |
|---|---|---|---|
| [Fundación Nínawa Daher](https://ninawadaher.org/) | 9 de enero de 2011 | 2012 | ~1 año |
| [Fundación Antonia](https://www.fundacionantonia.org/fundacion-antonia/) | 7 de febrero de 2017 | mediados de 2017 | ~5 meses |
| [Fundación Sergio Villar](https://www.entrenosdigital.com/agra-orzan/xentes-da-agra/fundacion-sergio-villar-legado-joven-mucha-luz/20250619120351019255.html) | 1 de abril de 2023 | marzo de 2024 | ~11 meses |
| [Fundación Marcelino Oliver](https://www.fundacionmarcelinooliver.org/el-perdon/) | 20 de noviembre de 2013 | 2017 | ~4 años |
| [Asociación Alhelí](https://asociacionalheli.org/asi-nacio-alheli/) | — | papeles octubre 2015, constituida enero 2016 | 3 meses de trámite |
| [Salud y Justicia Sobrevivientes ABC](https://semmexico.mx/sobrevivientes-de-la-guarderia-abc-de-la-tragedia-a-la-labor-como-promotores-de-conciencia/) | 5 de junio de 2009 | reuniones primero, movimiento después | años |
| [Casa Newenche](https://www.latribuna.cl/cronica-ciudadana/2026/01/22/espacio-comunitario-en-honor-a-maria-jesus-se-une-a-red-de-apoyo-solidario-en-los-angeles.html) | 19 de octubre de 2023 | espacio comunitario, no fundación | — |

El incendio de esta casa fue **el 7 de septiembre**. Estamos a cinco días. Ninguno de estos legados
existía a los cinco días, y el de la Guardería ABC empezó siendo «reuniones entre familias para
mantenerse unidas», que es un nombre honesto para lo que hay hoy acá.

Casa Newenche merece una nota aparte: en honor a María Jesús Troncoso no se creó una fundación sino
**un espacio comunitario**, que después terminó siendo centro de acopio para damnificados de otros
incendios. Un legado no está obligado a tomar la forma de una persona jurídica para ser real.

Y el patrón que atraviesa los cuatro casos memoriales que se pudieron leer completos es más importante
que las fechas: **la institución llegó cuando la práctica ya existía.** Teresa Salas de Mellano pintó
una estrella amarilla en el asfalto donde murió su hijo y recorrió el país con esa idea años antes de
que hubiera fundación, y la estrella terminó siendo señalización oficial de Vialidad Nacional y parte
del examen teórico de la licencia de conducir
([cronología oficial](https://www.argentina.gob.ar/seguridadvial/cronologia-de-estrellas-amarillas)).
Yolanda Verdugo se hizo autodidacta del duelo dos años antes de presentar los papeles de Alhelí. El
orden fue gesto, después práctica, después norma, después persona jurídica.

Traducido a este proyecto: si el legado va a ser formación en herramientas digitales, lo que le daría
credibilidad no es constituir nada. Es que alguien enseñe algo a alguien una vez, y que eso quede
fechado en el sitio. Eso convertiría `/legado` de una intención declarada en un «ya empezamos, en
chiquito» — que es lo que hizo cada uno de estos casos.

### 2.1 Nínawa Daher: el paralelo más exacto, y cómo estructura su página

[`ninawadaher.org`](https://ninawadaher.org/) es el caso que más se parece a lo que este proyecto dice
querer ser: una familia argentina que convirtió la memoria de **una comunicadora** en una organización
dedicada a comunicación, becas de periodismo y accesibilidad. Nínawa Daher era periodista y abogada;
murió en un accidente de tránsito el 9 de enero de 2011, y la fundación se constituyó en 2012.

Cuatro decisiones de esa página, todas contrarias a lo que haría una landing de campaña:

| Decisión | Cómo |
|---|---|
| **La obra va antes que la persona** | El orden de navegación es Inicio → Fundación → **Actividades** → **Nínawa** → Homenajes → Contacto. La biografía es la sección 4, no el anzuelo |
| **La muerta habla en primera persona** | El home abre con un poema que ella escribió: «Voy a repartir mis alas para todos. / Quiero que el mundo vuele con mi energía». Debajo, sólo dos fechas: «3/10/1979 - 9/1/2011» |
| **La muerte se comunica con una fecha, no con una escena** | El home **no menciona el accidente**. Ni una palabra sobre cómo murió. La familia decidió que la tragedia no es la propuesta de valor |
| **No hay «Donar» en ninguna parte** | Una fundación memorial de catorce años cuyo CTA terminal es «Contacto». El sitio existe para mostrar la obra y difundir el legado, no para recaudar |

Y hace algo baratísimo de implementar que casi nadie hace: **publica las autoridades con nombre,
cargo y oficio**, y son la madre, el padre y la hermana — Alicia Daher, presidenta, psicóloga y
empresaria; Ghandour Daher, tesorero, licenciado en ciencias políticas; Sumaia Daher, secretaria,
psicóloga y profesora de canto. Eso es transparencia de gobernanza sin un solo número.

La continuidad con la persona muerta es **vocacional, no emocional**: Nínawa era comunicadora y la
fundación trabaja en comunicación. Es exactamente el argumento que `/legado` necesita poder sostener,
y hoy lo sostiene: el nombre viene de lo que ella hacía.

La misma lógica aparece en la [Fundación Antonia](https://www.fundacionantonia.org/fundacion-antonia/),
de Concepción, Chile, con una decisión de orden que vale copiar: **«Nuestra historia» va después de la
misión**, y los datos bancarios están al final, en el bloque de contacto, sin botón, sin barra y sin
monto sugerido. La página no monetiza el relato de la muerte: el relato justifica que la organización
exista, y el dinero se resuelve como un trámite al pie. Es la relación correcta entre `/norma` y
`/ayudar`.

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

La cita más precisa sobre el hueco entre decidir y existir es de Alhelí, y sirve porque separa las dos
fechas sin solemnidad, como un trámite entre otros:

> «En ese instante me planteé dos opciones: compadecerme o crear Alhelí e intentar ayudar a personas
> que pudiesen estar viviendo lo que yo había vivido. **En octubre de 2015 eché los papeles y la
> asociación se constituyó en enero de 2016.**»

Y la del padre de Kim Gómez, en La Plata, muestra que decir en qué paso del trámite estás convierte la
falta de personería de debilidad en prueba de seriedad: **«No tenemos una cuenta bancaria, por eso aún
no hemos podido recibir grandes donaciones»**, más el detalle de que «sólo resta completar la firma
ante escribano»
([0221](https://www.0221.com.ar/la-plata/el-papa-kim-gomez-explico-como-funcionara-la-fundacion-que-llevara-el-nombre-su-hija-n133273)).

### 3.1 Cómo se recibe plata sin ser persona jurídica

Tres mecanismos reales, de menor a mayor formalidad. Ninguno requiere inventar una organización:

| Mecanismo | Quién lo hace | Cómo lo dice |
|---|---|---|
| **Administrar y decirlo** | Puerto Patriada | «El dinero de todos ustedes, lo único que nosotros hacemos es **administrarlo**» |
| **Ser puente, no receptor** | [Apadrina a una familia en la Comarca Andina](https://apadrinaaunafamilia.com.ar/) | «Somos referentes: **el puente** entre un padrino, una madrina, y el damnificado». Y para montos grandes: «existe la posibilidad de donar a una fundación» |
| **Patrocinio fiscal** | [Eaton Fire Collaborative](https://www.eatonfirecollaborative.org/) | En el pie: «is **fiscally sponsored by** Community Partners». Una organización ya constituida recibe y administra los fondos en nombre de una iniciativa que todavía no es persona jurídica |
| **Campaña con nombre propio dentro de una ONG que ya existe** | Construir Milagros | La campaña tiene nombre e identidad; la personería es prestada de la Fundación Impulso y Encuentro |

Los dos últimos son la respuesta institucional al problema del Paso 4, y el argentino más barato es el
de Apadrina: chico y directo a la familia, grande a través de una entidad ya inscripta. No requiere
ningún trámite y se dice en una oración.

**El patrón común a todos: nadie nombra una entidad futura en la misma superficie donde recibe dinero.**
Que no haya dónde donar al proyecto futuro *es* la decisión de diseño, no una omisión.

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

## 5. Los dos antiejemplos que importan

Estos no son campañas mal escritas: son casos donde la rendición de cuentas **existía** y no alcanzó.
Sirven porque este proyecto ya hace lo que ellos hacían y conviene saber por dónde falla igual.

### El Fondo Revita, Pedrógão Grande, Portugal: publicar totales no es rendir cuentas

Tras los incendios de junio de 2017 el Estado portugués creó el Fondo Revita para administrar las
donaciones y reconstruir viviendas: 5.446.296,31 € donados más 2.500.000 € de refuerzo estatal, 99
viviendas a cargo. El Tribunal de Cuentas dictaminó que las donaciones se asignaron «com falta de
critérios», con «irregularidades na sua distribuição», y que **«faltou transparência em todo o
processo»**
([Observador](https://observador.pt/especiais/pouca-transparencia-e-irregularidades-tribunal-de-contas-arrasa-gestao-dos-donativos-a-pedrogao-grande/)).

El matiz es el que importa, y es incómodo: el Tribunal **reconoce** que el fondo publicaba la lista de
donantes y informes trimestrales de ejecución. Lo que faltaba no era el número, eran **los criterios con
los que se decidió** — las actas, los apoyos concretos, y cómo se repartieron las viviendas.

Traducido a `/transparencia`: este sitio publica total recibido, total gastado, saldo y cada gasto con
fecha, concepto y si tiene comprobante. Eso es más de lo que publica cualquier colecta familiar que se
encontró. Pero un libro de gastos contesta *en qué se gastó* y no contesta *por qué eso primero*. La
lección, anotada y no implementada: si algún día hay que elegir entre dos rubros, la línea que explica
la elección vale más que el monto. Ocho años después, además, seguía habiendo obras suspendidas por
falta de pago
([ECO](https://eco.sapo.pt/2025/08/26/reconstrucao-de-casas-ardidas-ha-oito-anos-esteve-suspensa-por-falta-de-pagamento/)):
prometer un plazo y no cumplirlo destruye más confianza que no prometer ninguno.

### Comarca Andina, Chubut 2021: el dinero anunciado no es la casa entregada

Se firmaron convenios por 273,9 millones de pesos, de los cuales 237,5 millones para 250 viviendas de
emergencia en Lago Puelo. Meses después, un proyecto de resolución parlamentaria describía las
viviendas comprometidas en El Hoyo así: «aún no se han concluido, carecen de conexión a servicios, no
cuentan con aberturas; en suma, **son inhabitables**», con familias pasando el invierno «sin siquiera
energía eléctrica», cuando se había anticipado que estarían habitables en 45 días
([TN](https://tn.com.ar/politica/2021/08/16/incendios-en-chubut-denuncian-que-la-ayuda-millonaria-que-envio-el-gobierno-nunca-llego-a-lago-puelo/),
[proyecto 3210-D-2021](https://www4.hcdn.gob.ar/dependencias/dsecretaria/Periodo2021/PDF2021/TP2021/3210-D-2021.pdf)).

La unidad de medida de la confianza es la casa terminada y habitada, no el monto recaudado. Es un
argumento a favor de algo que el sitio ya hace —mostrar la obra en fotos fechadas— y en contra de algo
que el sitio ya evita: la barra de progreso como titular. Una cifra de dinero necesita al lado una
cifra física.

---

## 6. Qué se hace con todo esto

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

Cinco cosas que las referencias hacen y que **no** se implementan, porque implementarlas sería inventar
o porque no las decide este repositorio:

1. **Retirar una necesidad cuando está cubierta**, como hizo la campaña de Angélica con la ropa. Hoy
   este sitio no publica lista de necesidades en especie, así que no aplica. Si algún día se publica,
   la lección está acá: la lista tiene que poder decir «esto ya no hace falta».
2. **Apoyarse en una organización que ya exista**, como hizo Milagros con la Fundación Impulso y
   Encuentro, o recibir por **patrocinio fiscal**, como el Eaton Fire Collaborative. Es la alternativa
   más sólida que encontró esta investigación para el legado, y es una decisión **de la familia**, no
   de diseño. Se anota como opción documentada; no se anuncia, no se insinúa en la página, y `/legado`
   sigue diciendo lo que dice hoy.
3. **Derivar los montos grandes a una entidad ya inscripta**, en una oración, como hace Apadrina. Misma
   condición: lo decide la familia, y hoy no hay entidad que nombrar.
4. **La frase que separa lo que la casa devuelve de lo que no.** La tiene que escribir la familia.
5. **Enseñar algo una vez y fecharlo**, que es lo que convertiría `/legado` en «ya empezamos». Es la
   diferencia entre un legado y una recaudación, y no la produce el código.

### Un riesgo que la investigación deja señalado

Altadena Girls pasó de «mis amigas perdieron su ropa» a una organización con centro comunitario, y en
el camino su sitio dejó de mencionar a una sola chica concreta y a Altadena como lugar. Ganó misión y
perdió cara. Es el precio de la transición de urgencia a institución, y conviene verlo antes de
pagarlo sin querer: si algún día `/legado` crece, la prueba de que no se perdió el rumbo es que Norma
siga teniendo nombre, cocina y camisa a rayas en el sitio.

## Documentos relacionados

| Documento | Qué agrega |
|---|---|
| [`../adr/024-tercera-direccion-visual.md`](../adr/024-tercera-direccion-visual.md) | La decisión que esta investigación verifica a posteriori |
| [`../content-guide.md`](../content-guide.md) | Qué está verificado y qué falta, que es el límite de lo publicable |
| [`../../specs/001-sitio-publico-campana/ux.md`](../../specs/001-sitio-publico-campana/ux.md) | §1, el orden del relato y la prohibición de abrir con la pérdida |
