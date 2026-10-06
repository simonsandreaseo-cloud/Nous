const fs = require('fs');

const base_file = "C:/Users/Simon San/Documents/Simón SEO/Desarrollos/Nous/Staging/goal_17/tasks/99768edf-252f-451c-8445-f83fce602f53/base.html";
const hum_file = "C:/Users/Simon San/Documents/Simón SEO/Desarrollos/Nous/Staging/goal_17/tasks/99768edf-252f-451c-8445-f83fce602f53/hum1.html";
const surg1_file = "C:/Users/Simon San/Documents/Simón SEO/Desarrollos/Nous/Staging/goal_17/tasks/99768edf-252f-451c-8445-f83fce602f53/surg1.html";
const surg2_file = "C:/Users/Simon San/Documents/Simón SEO/Desarrollos/Nous/Staging/goal_17/tasks/99768edf-252f-451c-8445-f83fce602f53/surg2.html";

let text = fs.readFileSync(base_file, 'utf8');

const hum_replacements = [
    ["Mira estas gafas", "Oye mira las gafas estas"],
    ["las monturas acaparan miradas y notas rápido que los materiales aguantan", "las monturas llaman la atención brutal y notas de una que el material es bueno"],
    ["El sol molesta mucho en la calle, protegen tu visión y de paso llevas ese toque de lujo italiano encima; son modelos muy de moda para que te veas bien siempre", "El sol pega fuerte en la calle, te cuidan los ojos y de paso te pones ese lujo italiano encima, o sea son modelos súper de moda pa que te veas increíble siempre"],
    ["Seleccionar las mejores gafas Gucci requiere tiempo para analizar estilos y materiales.", "Elegir las mejores gafas Gucci toma su rato pa ver estilos y de qué están hechas."],
    ["Hemos curado esta lista con opciones sobresalientes que capturan las tendencias actuales de mayor demanda", "Armamos esta lista con opciones brutales que tienen lo que más se busca ahora"],
    ["Este top 3 te sirve como guía si buscas una montura con carácter que tape bien el sol y resulte cómoda durante todo el día.", "Este top 3 te vale de guía si quieres una gafa con personalidad que te tape bien el sol y sea cómoda todo el santo día."],
    ["El modelo Gucci GG2023S encabeza la categoría de gafas estilo máscara para mujer, aportando un aire futurista y envolvente ideal para quienes buscan el sello más audaz de la firma italiana.", "Las Gucci GG2023S son las reinas de las gafas tipo máscara para mujer. Dan un rollo futurista que envuelve la cara y es genial si buscas lo más atrevido de la marca."],
    ["Fabrican la montura en material inyectado de alta densidad en color negro brillante, resistente al uso diario y con un pulido impecable.", "Hacen la montura con un material inyectado súper denso en negro brillante, aguanta el trote diario y brilla que da gusto."],
    ["Su monolente continuo de 99 milímetros en tono gris cubre ampliamente la mirada, se adapta con firmeza al rostro y protege del sol desde todos los ángulos sin dejar marcas molestas en la nariz.", "Su lente gigante de 99 milímetros en gris te tapa los ojos un montón, se agarra bien a la cara y te protege del sol por todos lados sin dejarte marcas feas en la nariz."],
    ["Los detalles de la firma en las varillas muestran la identidad de la casa con equilibrio.", "Los detalles de la marca en las patillas muestran quién manda pero sin exagerar."],
    ["Para incorporar el diseño de pasarela más buscado, te sugiero", "Si quieres el diseño que más lo peta en pasarela, te digo que"],
    ["capaces de transformar cualquier conjunto al instante", "que te cambian cualquier look en un segundo"],
    ["El modelo GG0034SN revitaliza instantáneamente atuendos sobrios, siendo ideal para quienes buscan un impacto visual elegante.", "Las GG0034SN levantan cualquier ropa sosa en un segundo. Son lo más si quieres verte elegante de golpe."],
    ["Tienen una pasta gruesa que da un aire misterioso y bloquea el sol directo sin esfuerzo.", "Tienen una pasta gorda que te da un toque de misterio y te quita el sol de la cara sin problemas."],
    ["Ves el logo dorado en esas varillas anchas y sabes rápido que es un diseño de pasarela.", "Le ves el logo dorado en esas patillas tan anchas y sabes de una que es diseño de pasarela."],
    ["la forma cuadrada suavizada favorece las facciones y permite ver todo muy nítido.", "la forma cuadrada pero suavecita te queda genial y ves todo súper claro."],
    ["Les pusieron unas bisagras fuertes para que no aprieten y las aguantes puestas todo el día.", "Les metieron unas bisagras duras pa que no te aprieten y las aguantes puestas todo el día."],
    ["para sumar ese toque italiano a tu colección", "pa meterle ese rollo italiano a tus cosas"],
    ["El modelo GG1221S cierra esta lista y es un diseño moderno con formas geométricas donde se nota al instante el toque de lujo.", "El modelo GG1221S cierra la lista y es un diseño súper moderno con formas geométricas donde se nota de una que es lujo del bueno."],
    ["Gucci pensó en mujeres activas cuando hizo estas gafas porque mezclan ligereza con el estilo clásico europeo de siempre", "Gucci pensó en mujeres que no paran cuando hizo estas gafas porque mezclan lo ligeras que son con el estilo clásico de Europa de toda la vida"],
    ["te protegen de los rayos UV por todos lados", "te cubren de los rayos UV por todas partes"],
    ["Combinan una estructura estilizada resistente al calor y al uso diario con bordes biselados muy cuidados.", "Juntan una estructura finita que aguanta el calor y el uso de cada día con unos bordes súper trabajados."],
    ["El diseño interior de las patillas evita que se resbalen, por lo que te pones las gafas y se quedan fijas detrás de las orejas casi sin sentirlas.", "El diseño por dentro de las patillas hace que no se resbalen, así que te pones las gafas y se quedan ahí pegadas detrás de las orejas que ni las notas."],
    ["Si quieres llamar la atención con elegancia", "Si quieres que te miren pero con clase"],
    ["Gucci siempre dicta tendencias en ropa, y con los lentes de sol sucede lo mismo.", "Gucci siempre marca lo que se lleva en ropa, y con los lentes de sol pasa igualito."],
    ["A la gente le gusta mucho la marca porque toman unos lentes normales para el sol y crean una", "A la peña le encanta la marca porque pillan unos lentes normales pa el sol y se montan una"],
    ["que destaca en cualquier entorno cuando los llevas puestos.", "que destaca donde sea cuando te los pones."],
    ["ofrece opciones diversas para las mujeres, lanzando colecciones con diseños que van desde formas cuadradas", "tiene mil opciones pa mujeres, sacando colecciones con diseños que van desde cuadrados"],
    ["que combinan con cualquier rostro y ofrecen gran versatilidad", "que le quedan bien a cualquier cara y valen pa todo"],
    ["presta profunda atención a la fisionomía facial, reafirmando su", "se fija muchísimo en la forma de la cara, dejando claro su"],
    ["por encima de todo.", "por encima de cualquier cosa."],
    ["Hoy las mujeres se ponen estos lentes para verse con más estilo y presumen ese", "Hoy las mujeres se plantan estos lentes pa verse con más rollo y presumen de ese"],
    ["que resulta cautivador.", "que engancha."],
    ["Crean marcos amplios que captan miradas desde lejos, combinando metales llamativos y fijando el logo GG en las patillas", "Hacen marcos enormes que la gente mira de lejos, mezclando metales llamativos y pegando el logo GG en las patillas"],
    ["cualquier ropa básica resalta al instante gracias a su", "cualquier ropa normalita resalta de una por su"],
    ["Los accesorios de lujo están recuperando siluetas de archivo y dándoles un giro más atrevido.", "Las cosas de lujo están sacando formas viejas y dándoles un toque más loco."],
    ["Cuando miras la alta costura y el", "Cuando ves la alta costura y el"],
    ["te das cuenta de que mandan los noventa y los años dos mil", "te das cuenta de que mandan los noventa y los dos mil"],
    ["las marcas históricas reviven sus diseños clásicos y los vuelven muy actuales", "las marcas de toda la vida reviven sus diseños clásicos y los hacen súper actuales"],
    ["encabezan este movimiento con un estilo limpio que hace que la gente voltee a mirarlas", "son las jefas de este rollo con un estilo limpio que hace que todo el mundo se gire a mirarlas"],
    ["El retorno a la estética del año 2000 (Y2K) ha transformado radicalmente los códigos de la moda óptica.", "Volver a la estética del año 2000 (Y2K) ha cambiado totalmente las reglas de la moda óptica."],
    ["Los datos más recientes del catálogo oficial de Gucci respaldan esta evolución del mercado", "Los datos más nuevos del catálogo oficial de Gucci confirman esta movida del mercado"],
    ["exhibe una fortaleza arrolladora con", "está arrasando con"],
    ["en su rotación de temporada.", "dando vueltas esta temporada."],
    ["Esta presencia demuestra que, para dominar las siluetas actuales, incorporar el", "Esto demuestra que, pa mandar en las formas que se llevan ahora, meter el"],
    ["es un movimiento estilístico imprescindible", "es un paso obligatorio"],
    ["sino que la dicta, fusionando la frescura nostálgica con su inconfundible opulencia italiana", "sino que dice cómo se hace, mezclando la frescura nostálgica con su lujazo italiano de siempre"],
    ["Estas gafas lucen geniales y suavizan el rostro rápidamente.", "Estas gafas se ven geniales y te suavizan la cara rapidísimo."],
    ["Mientras las cuadradas endurecen las facciones, los marcos ovalados armonizan con tus rasgos naturales y te salvan de apuros.", "Mientras que las cuadradas te hacen las facciones más duras, los marcos ovalados pegan con tus rasgos naturales y te sacan de un apuro."],
    ["Gucci agarró esto y lo mejoró un montón, fabricando modelos que se ven minimalistas pero esconden muchísimo trabajo.", "Gucci cogió esto y lo mejoró una barbaridad, haciendo modelos que se ven sencillos pero tienen un montón de curro detrás."],
    ["Miden el acetato al milímetro, así los lentes caen justo sobre los pómulos y no te tapan las cejas, lo que hace que te veas más segura y con un toque de misterio.", "Miden el acetato al dedillo, así los lentes te caen justo en los pómulos y no te tapan las cejas, haciendo que te veas más segura y con un aire de misterio."],
    ["Entender el regreso de estas gafas de mujer es fácil si te fijas en los detalles, donde saltan a la vista las diferencias con un modelo cualquiera.", "Entender por qué vuelven estas gafas de mujer es tirado si te fijas en los detalles, ahí saltan a la vista las diferencias con un modelo cualquiera."],
    ["La marca italiana toma esos estilos del pasado y les incorpora varios elementos de diseño que son clave", "La marca italiana pilla esos estilos del pasado y les mete un par de cosas de diseño que son la clave"],
    ["Gucci juega con los volúmenes", "Gucci juega con el tamaño"],
    ["el marco frontal de estas gafas ovaladas es robusto y enmarca la mirada", "la parte de alante de estas gafas ovaladas es gorda y te enmarca los ojos"],
    ["las varillas se estilizan.", "las patillas son finitas."],
    ["El peso se reparte mejor así y no cansan nada si las llevas puestas todo el día.", "Así el peso se reparte mejor y no te cansan nada si las llevas todo el día."],
    ["Los lentes más buscados integran el emblema GG cerca de la bisagra y estructuran el marco alrededor de él.", "Los lentes que más se buscan llevan el logo GG cerca de la bisagra y arman la gafa a su alrededor."],
    ["A veces mezclan el núcleo metálico interior con acetatos translúcidos, haciendo que la firma forme parte del esqueleto del lente.", "A veces mezclan el hierro de dentro con acetatos transparentes, haciendo que la firma sea parte del esqueleto del lente."],
    ["Además del negro o el carey clásico, sacaron modelos inspirados en los años 2000 con tonos intensos, acabados perlados y detalles en oro envejecido que atrapan la luz de frente.", "Aparte del negro o el carey de siempre, sacaron modelos inspirados en los años 2000 con colores súper fuertes, acabados tipo perla y detalles en oro viejo que pillan la luz de frente."],
    ["Recuperan la estética de los 90, frenan al 100% los rayos UV y resultan más translúcidas en tonos rosa, ámbar o gris degradado, permitiendo llevarlas tanto en exteriores como en interiores luminosos.", "Vuelven al rollo de los 90, paran los rayos UV al 100% y son más transparentes en tonos rosa, naranja o gris degradado, así que te las puedes poner tanto en la calle como en sitios con luz dentro."],
    ["Llevar algo de esta colección sirve para mucho más que tapar el sol: aporta presencia inmediata.", "Llevar algo de esta colección vale pa mucho más que taparte el sol: te da presencia de una."],
    ["Las celebridades y referentes de moda combinan el diseño ovalado tanto con sastrería masculina como con conjuntos urbanos.", "Los famosos y la gente de moda se ponen el diseño ovalado tanto con trajes de tío como con ropa de calle."],
    ["Además, los artesanos en Italia pulen a mano cada montura de acetato para que conserve su brillo temporada tras temporada.", "Y encima, los artesanos en Italia pulen a mano cada montura de acetato pa que siga brillando temporada tras temporada."],
    ["Invertir en accesorios de lujo toma su tiempo.", "Gastarse los cuartos en accesorios de lujo lleva su tiempo."],
    ["Debes fijarte bien en lo que favorece a tu rostro y considerar el uso diario para acertar.", "Tienes que fijarte bien en lo que te queda bien a la cara y pensar en ponértelas todos los días pa acertar."],
    ["Aquí contrastamos dos de los modelos adicionales más pedidos de la marca italiana", "Aquí ponemos cara a cara dos de los modelos que más pide la gente a la marca italiana"],
    ["Analizamos cada detalle de las monturas para que puedas comparar dos filosofías de diseño opuestas dentro del mismo catálogo.", "Miramos con lupa cada detalle de las monturas pa que puedas comparar dos rollos de diseño totalmente distintos dentro de su mismo catálogo."],
    ["Estos dos modelos tienen la mejor calidad de la marca y unos detalles muy cuidados, aunque representan estilos muy distintos.", "Estos dos modelos tienen la mejor calidad de la marca y unos detalles flipantes, aunque son de estilos súper diferentes."],
    ["Un diseño es más actual con líneas rectas bastante gruesas, mientras que el otro resulta más suave y estilizado con un aire retro de los años setenta.", "Uno es más de ahora con líneas rectas bastante gordas, y el otro es más suavecito y fino con un rollo retro de los años setenta."],
    ["perfiles de alto grosor.", "bordes súper gordos."],
    ["doble puente metálico.", "puente doble de metal."],
    ["amantes de la vanguardia arquitectónica y looks estructurados.", "pa las que les mola la vanguardia y looks muy armados."],
    ["espíritu aventurero y estética casual elevada.", "con espíritu de aventura y rollo casual pero top."],
    ["Sólido oscuro de alto contraste, ideal para máxima privacidad y luminosidad intensa.", "Oscuro a tope pa alto contraste, perfecto pa esconderte y mucha luz."],
    ["Degradado suave que permite una transición lumínica sutil y contacto visual.", "Degradado suavecito que deja pasar la luz un poco y que te vean los ojos."],
    ["Las gafas de formas cuadradas y rectangulares predominan en la colección femenina de Gucci con más de cuarenta variantes activas.", "Las gafas cuadradas y rectangulares mandan en la colección de mujer de Gucci con más de cuarenta tipos dando vueltas."],
    ["Entre tanta geometría, surge este modelo sobrio que redefine el lujo actual.", "Entre tanta forma, sale este modelo serio que le da una vuelta al lujo de hoy."],
    ["Si quieres destacar y verte elegante de forma sencilla", "Si quieres que te vean y lucir elegante pero sin complicarte"],
    ["y completas tu look al instante. Te contamos aquí abajo los detalles técnicos que las hacen tan resistentes", "y ya tienes el look hecho en un segundo. Te soltamos aquí abajo las movidas técnicas que las hacen tan duras"],
    ["El acetato de celulosa de alta densidad soporta el uso diario y los cambios de temperatura sin deformarse.", "El acetato ese de alta densidad aguanta el trote diario y los cambios de calor sin torcerse."],
    ["El puente sigue la ergonomía europea para que el peso caiga parejo sobre la nariz sin dejar marcas rojas ni resbalarse.", "El puente está hecho a lo europeo pa que el peso caiga igual por la nariz sin dejarte rojo ni resbalar."],
    ["Sus 53 milímetros cubren muy bien el contorno ocular sin verse desproporcionados en el rostro, bloqueando los reflejos laterales.", "Sus 53 milímetros te tapan muy bien el ojo sin verse gigantes en la cara, cortando los brillos de los lados."],
    ["Incorpora lentes orgánicas ligeras con protección UV400 completa, filtro solar de categoría 3 y tratamiento antirreflejante interno.", "Llevan lentes de plástico súper ligeras que paran los rayos UV400 a tope, filtro de sol categoría 3 y tratamiento por dentro pa que no reflejen."],
    ["Frente al dominio de los lentes cuadrados o rectangulares, el estilo aviador para mujer es mucho más selecto dentro de la firma: Gucci apenas incluye cuatro diseños de este corte en su rotación, lo que convierte a las", "Con tanto lente cuadrado o rectangular por ahí, el rollo aviador pa mujer es mucho más exclusivo en la marca: Gucci casi ni mete cuatro diseños así ahora mismo, lo que hace que las"],
    ["en piezas muy buscadas. El armazón de metal no pesa nada y mantiene el doble puente clásico fusionado con los acabados de lujo de Italia.", "sean súper buscadas. El armazón de metal no pesa un carajo y mantiene el puente doble de siempre juntado con los acabados de lujo de Italia."],
    ["Desde la perspectiva de la consultoría de imagen y el visagismo", "Hablando de imagen y formas de cara"],
    ["el amplio", "el tamaño gigante del"],
    ["de esta lente en forma de lágrima resulta especialmente favorecedor para rostros con morfología cuadrada, rectangular o en forma de diamante.", "de este lente con forma de lágrima te queda brutal si tienes la cara cuadrada, rectangular o tipo diamante."],
    ["La curvatura suave de la base inferior de la lente suaviza las mandíbulas angulosas", "La curva suave de abajo del lente te disimula la mandíbula cuadrada"],
    ["mientras que la línea horizontal que traza el diseño de doble puente equilibra visualmente la longitud vertical en personas con frentes amplias.", "y la raya horizontal que hace el puente doble te arregla lo largo de la cara si tienes mucha frente."],
    ["Entras a mirar el catálogo femenino de Gucci y ves que organizan todo por la forma del lente y una amplia gama de colores.", "Te metes a bichear el catálogo de mujer de Gucci y ves que lo ordenan todo por la forma del cristal y un montón de colores."],
    ["Los diseñadores hicieron estas monturas para las mujeres de hoy: puedes llevarte algo minimalista o esos diseños envolventes de pasarela que siempre destacan.", "Los diseñadores hicieron estas monturas pa las tías de ahora: te puedes pillar algo súper sencillo o esos diseños gigantes de pasarela que llaman la atención siempre."],
    ["Gucci estructura su colección femenina en cinco grandes familias de diseño pensadas para adaptarse a cualquier rostro o estilo personal", "Gucci monta su colección de mujeres en cinco familias grandes de diseño hechas pa quedar bien en cualquier cara o rollo que lleves"],
    ["Son los clásicos lentes de piloto actualizados con acetatos nobles y metales pulidos de alto brillo.", "Son los lentes de piloto de toda la vida pero modernos con acetatos buenos y metales súper brillantes."],
    ["Tienen el doble puente característico y quedan bien con casi cualquier prenda.", "Tienen el puente doble de siempre y pegan con casi todo."],
    ["Tienen ese aire femenino de inspiración retro donde el marco sube en las esquinas exteriores, estilizando las facciones y haciendo que los pómulos resalten de inmediato.", "Tienen ese toque de chica retro donde el marco sube por las esquinas de fuera, estirando la cara y haciendo que los pómulos se noten de una."],
    ["Son gafas envolventes de gran formato construidas en torno a una pantalla continua que cubre ampliamente el rostro y ofrece la máxima protección solar con una estética de pasarela.", "Son gafas gigantes hechas alrededor de un solo cristal que te tapa toda la cara y te protege a tope del sol con un rollo de pasarela."],
    ["Marcos curvos que recuperan la esencia de los años 70 y 90, suavizan los rasgos angulosos y combinan con naturalidad en looks diarios.", "Marcos con curvas que traen de vuelta los años 70 y 90, suavizan las caras muy cuadradas y pegan súper natural para ponértelas a diario."],
    ["Presentan líneas rectas muy definidas que aportan estructura al rostro y constituyen la familia más numerosa del catálogo actual de la firma.", "Tienen líneas rectas súper marcadas que le dan forma a la cara y son el grupo más grande que tiene la marca ahora mismo."],
    ["El estilo de montura máscara (<em>Mask</em>) tiene un origen deportivo y futurista, ideado inicialmente para proteger a los atletas frente a condiciones extremas.", "El rollo de la montura máscara (<em>Mask</em>) viene del deporte y lo futurista, pensado al principio pa proteger a los deportistas cuando la cosa se ponía fea."],
    ["Gucci ha adaptado este concepto utilitario llevándolo directamente a la alta costura.", "Gucci ha pillado esta idea útil y la ha metido directa en la alta costura."],
    ["Las gafas de sol tipo máscara para mujer mantienen una fuerte presencia con 14 modelos en el catálogo oficial", "Las gafas de sol tipo máscara pa mujer siguen pisando fuerte con 14 modelos en el catálogo oficial"],
    ["consolidándose como un sello de la marca caracterizado por su monolente continuo, varillas anchas y una estética audaz para quienes buscan un estilo envolvente y glamuroso.", "quedándose como una marca de la casa que destaca por su cristal único, patillas gordas y un rollo súper atrevido pa las que quieren algo envolvente y con mucho glamour."],
    ["Gucci lanza gafas en múltiples colores de montura y lente para adaptarse a tu vestuario diario.", "Gucci saca gafas en un montón de colores de montura y lente pa que peguen con tu ropa de cada día."],
    ["Dentro de la rotación principal encontrarás tonos clásicos y opciones metálicas que nunca fallan", "En lo que sacan siempre vas a encontrar colores clásicos y cosas metálicas que nunca fallan"],
    ["Además, en cada temporada la firma incorpora ediciones especiales en tonos vibrantes que suelen agotarse rápidamente entre las coleccionistas", "Y encima, cada temporada la marca mete ediciones raras en colores súper fuertes que se venden volando entre las que coleccionan"],
    ["Adquirir gafas de lujo por internet es mucho más sencillo cuando conoces el", "Pillarse gafas de lujo por internet es súper fácil cuando sabes el"],
    ["y el sistema de ajuste de la marca.", "y cómo aprieta la marca."],
    ["Los diseñadores calculan las proporciones de estas gafas con puentes anatómicos y varillas equilibradas para que la montura se mantenga firme en distintas fisonomías sin presionar las sienes.", "Los diseñadores calculan las medidas de estas gafas con puentes que se adaptan y patillas niveladas pa que la montura se quede quieta en diferentes caras sin reventarte la cabeza."],
    ["La gran mayoría de las gafas de sol de diseño para mujer en Gucci se fabrican bajo el estándar de", "Casi todas las gafas de sol de diseño pa mujer en Gucci se hacen con la medida de"],
    ["especialmente en los modelos tipo máscara (<em>Mask</em>) y oversize", "sobre todo en los modelos tipo máscara (<em>Mask</em>) y los enormes"],
    ["mientras que las siluetas cuadradas, redondas o rectangulares especifican su calibre milimétrico exacto (habitualmente entre 51 mm y 58 mm) en el interior de la varilla para facilitar un ajuste preciso.", "mientras que las formas cuadradas, redondas o rectangulares te dicen sus milímetros exactos (normalmente entre 51 mm y 58 mm) por dentro de la patilla pa que te las puedas ajustar al milímetro."],
    ["El precio de las gafas Gucci varía en función de sus materiales, la complejidad arquitectónica del armazón y los acabados manuales realizados en Italia o Japón.", "El precio de las gafas Gucci cambia dependiendo de los materiales, lo complicado que sea hacer el armazón y los toques a mano que le dan en Italia o Japón."],
    ["No lleva el mismo trabajo producir una montura de acetato clásico que ensamblar un diseño tipo máscara con aplicaciones metálicas o cristales engastados.", "No cuesta lo mismo hacer una montura de acetato normal que montar un diseño tipo máscara con trozos de metal o cristales pegados."],
    ["Monturas de acetato premium en colores sólidos, siluetas geométricas estándar (cuadradas, rectangulares) y logotipos grabados o integrados de forma minimalista en las varillas.", "Monturas de acetato top en colores lisos, formas normales (cuadradas, rectangulares) y logos grabados o metidos súper discretos en las patillas."],
    ["Diseños que combinan metales pulidos con acetato texturizado.", "Diseños que juntan metales brillantes con acetato con textura."],
    ["Incluyen emblemas entrelazados GG de gran tamaño, aplicaciones de esmalte y lentes degradadas de alta definición.", "Traen el logo GG súper grande, trozos de esmalte y lentes degradadas que se ven de locos."],
    ["Formatos tipo escudo y máscara, monturas con incrustaciones de cristales, detalles de joyería en las varillas, ediciones limitadas de pasarela y arquitecturas oversize complejas.", "Rollos tipo escudo y máscara, monturas con cristales metidos, cosas de joyería en las patillas, ediciones raras de pasarela y monturas gigantes súper complicadas."],
    ["Si quieres explorar todas las variantes disponibles en nuestra óptica autorizada, puedes consultar el", "Si quieres cotillear todos los modelos que tenemos en nuestra óptica de verdad, puedes mirarte el"],
    ["Los diseños de la marca poseen un sello inconfundible, exclusivo de sus productos originales.", "Los diseños de la marca tienen un rollo que no se puede copiar, solo lo tienen los de verdad."],
    ["Al invertir en lujo, buscas la calidad que Gucci imprime en cada pieza: monturas precisas, cristales nítidos con protección UV400 de fábrica y materiales hipoalergénicos duraderos.", "Cuando te gastas pasta en lujo, buscas la calidad que Gucci le mete a cada cosa: monturas perfectas, cristales súper claros que paran el sol UV400 desde que salen de fábrica y materiales que no dan alergia y duran un montón."],
    ["Invertir en alta costura exige examinar minuciosamente los acabados para confirmar su procedencia italiana.", "Gastarse pasta en alta costura te obliga a mirar con lupa los acabados pa saber que vienen de Italia de verdad."],
    ["Más allá de mirar el logotipo por encima, te indicamos los elementos exactos que debes revisar con cuidado:", "Más allá de mirar el logo por encima, te decimos las cosas exactas que tienes que chequear con cuidado:"],
    ["Revisa la patilla derecha por la parte interior; ahí verás el sello de Gucci junto a la inscripción", "Mírate la patilla derecha por dentro; ahí vas a ver el sello de Gucci con la frase"],
    ["y el marcado europeo CE. En la otra varilla figura el código del modelo (como GG2023S o GG1778S), el código de color y las medidas de calibre y puente con un grabado limpio que no se borra al pasar el dedo.", "y la marca europea CE. En la otra patilla viene el código del modelo (tipo GG2023S o GG1778S), el código del color y las medidas de lo ancho y el puente con un grabado súper limpio que no se quita si le pasas el dedo."],
    ["Las Gucci originales emplean bisagras metálicas sólidas perfectamente integradas en el acetato, sin restos de pegamento ni holguras.", "Las Gucci de verdad llevan bisagras de metal súper duras metidas perfectas en el acetato, sin pegotes de pegamento ni que bailen."],
    ["Al abrir y cerrar las varillas, el movimiento debe sentirse suave, firme y silencioso.", "Cuando abres y cierras las patillas, se tiene que sentir suave, duro y sin hacer ruido."],
    ["Las gafas se entregan en su estuche rígido forrado en terciopelo (cuyo color varía según la colección), acompañado de una funda de satén a juego, paño de microfibra color marfil con el emblema de la casa y su documentación oficial.", "Las gafas te las dan en su caja dura forrada de terciopelo (el color cambia según la colección), con una bolsita de tela que pega, un trapito color marfil con el logo de la marca y sus papeles oficiales."],
    ["Verifica siempre la inclusión del folleto y certificado de autenticidad en papel de alto gramaje.", "Chequea siempre que traiga el librito y el papel de que es original impreso en un cartón bueno."],
    ["Si quieres profundizar en cada punto de control, consulta nuestra guía con las", "Si quieres meterte de lleno en cada cosita pa comprobar, mírate nuestra guía con las"],
    ["antes de realizar tu compra.", "antes de soltar la pasta."]
];

for (let i = 0; i < hum_replacements.length; i++) {
    text = text.replace(hum_replacements[i][0], hum_replacements[i][1]);
}
fs.writeFileSync(hum_file, text, 'utf8');

const surg1_replacements = [
    ["llamativos y pegando el logo", "exquisitos y adhiriendo el logo"],
    ["un montón de curro detrás", "un nivel de manufactura considerable detrás"],
    ["están sacando formas viejas", "están rescatando formas vintage"],
    ["Las GG0034SN levantan cualquier ropa", "Las GG0034SN realzan cualquier conjunto"]
];

let text1 = text;
for (let i = 0; i < surg1_replacements.length; i++) {
    text1 = text1.replace(surg1_replacements[i][0], surg1_replacements[i][1]);
}
fs.writeFileSync(surg1_file, text1, 'utf8');

const surg2_replacements = [
    ["que te cambian cualquier look en un segundo", "transforman cualquier look al instante"],
    ["hace que no se resbalen", "previene el deslizamiento"],
    ["te las puedes poner tanto", "te las puedes lucir tanto"],
    ["la marca europea CE.", "la certificación europea CE."]
];

let text2 = text1;
for (let i = 0; i < surg2_replacements.length; i++) {
    text2 = text2.replace(surg2_replacements[i][0], surg2_replacements[i][1]);
}
fs.writeFileSync(surg2_file, text2, 'utf8');

console.log("All transformations applied successfully.");
