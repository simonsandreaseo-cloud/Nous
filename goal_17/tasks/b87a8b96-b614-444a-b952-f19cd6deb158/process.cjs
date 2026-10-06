const fs = require('fs');

const baseFile = "base.html";
const hum1File = "hum1.html";
const surg1File = "surg1.html";
const surg2File = "surg2.html";

let html = fs.readFileSync(baseFile, 'utf8');

// hum1 replacements
const hum1Replacements = [
    ["El actor Steve McQueen popularizó las icónicas Persol 714. Estas pioneras gafas plegables italianas incluyen cristales minerales excelentes para proteger la vista, ostentan un diseño clásico con detalles únicos y garantizan un ajuste impecable.", "El actor Steve McQueen hizo súper famosas las Persol 714. Estas gafas italianas que se doblan tienen cristales minerales tremendos para los ojos, y encima lucen un diseño de siempre con cositas únicas y te quedan niqueladas."],
    ["Analizamos minuciosamente el acetato artesanal y los cristales minerales de la edición especial dedicada al legendario actor para seleccionar las tres configuraciones más representativas del catálogo. Tras evaluar su ergonomía, sistema de plegado y comportamiento óptico en distintas condiciones de luz, elaboramos esta comparativa para agilizar tu elección.", "Miramos con lupa el plástico artesanal y los cristales de la edición del mítico actor para sacar las tres opciones más top. Después de probar si son cómodas, cómo se doblan y qué tal se ve con ellas en la calle, te dejamos esta comparativa para que elijas fácil."],
    ["Rostros cuadrados, ovalados y coleccionistas del estilo cinematográfico original", "Caras cuadradas, ovaladas y los frikis del cine de toda la vida"],
    ["Conducción diurna intensa, entornos marítimos y máxima reducción de reflejos", "Para conducir a pleno sol, ir a la playa y quitarte los reflejos molestos"],
    ["Uso cotidiano versátil, días de luminosidad variable y realce cálido del contraste", "Para ponértelas todos los días, cuando el sol va y viene, y ver los colores más vivos"],
    ["Su fascinante legado justifica plenamente la inversión, recreando la combinación exacta de acetato Terra di Siena y cristales minerales azules que Steve McQueen inmortalizó en el cine. Plegar el puente y las varillas hacia el interior evidencia las horas de artesanía italiana que garantizan una firmeza impecable en el rostro. Resultan ideales para quienes buscan una pieza histórica de coleccionista; al decidir ", "Toda la historia que tienen detrás hace que valga la pena comprarlas, porque son igualitas a las de acetato Terra di Siena con cristales azules que llevaba Steve McQueen en las pelis. Doblar el puente y las patillas te deja ver que los italianos saben lo que hacen para que no se te caigan de la cara. Son lo más para los que coleccionan cosas históricas; cuando decides "],
    [" y palpar su montura, confirmarás su calidad superior al instante.", " y tocas la gafa, notas que son buenísimas del tirón."],
    ["Esta variante de la colección combina perfectamente tanto en la conducción por carretera como en paseos bajo sol intenso. Su excelente diseño mantiene el acetato Terra di Siena e incluye las varillas con sistema Meflecto, que funcionan como microamortiguadores que reducen la presión craneal y permiten llevarlas durante toda la jornada con total confort.", "Esta otra versión pega con todo, ya sea conduciendo por ahí o dando un paseo con un sol que raja las piedras. El diseño está chulísimo y sigue con el acetato Terra di Siena, trayendo patillas con eso del Meflecto, que hace como de amortiguador para que no te apriete la cabeza y puedas llevarlas todo el día la mar de a gusto."],
    ["Ingeniería Frontal: El marco de estilo piloto plegable de 54 mm con puente de cerradura suaviza las facciones angulosas y equilibra el peso sobre el tabique nasal.", "Frontal de locos: El marco este de aviador que se dobla de 54 mm con el puente así como de cerradura hace que la cara se vea mejor y no te pesa en la nariz."],
    ["Calidad Óptica Polarizada: Para largas horas al volante enfrentando destellos en el asfalto, las ", "Cristales polarizados a tope: Para estar mil horas al volante con los brillos de la carretera, las "],
    [" son ideales; sus cristales minerales Barberini bloquean el deslumbramiento horizontal y relajan la visión.", " van perfectas; los cristales esos Barberini te quitan los deslumbramientos y te descansan los ojos un montón."],
    ["Ergonomía: La suave curvatura del acetato envuelve sin presionar, asegurando un ajuste firme y libre de molestias durante el uso continuado.", "Súper cómodas: La curva del acetato te agarra pero sin apretar, así que no se mueven ni molestan aunque las lleves puestas un buen rato."],
    ["Su extrema comodidad y su estética cálida en acetato Terra di Siena con lentes minerales marrones convierten a esta referencia en una opción sumamente versátil. Nuestro análisis destaca el diseño de puente anatómico en forma de herradura que afianza la montura al tabique nasal sin resbalar.", "Lo cómodas que son y lo bien que se ven en acetato Terra di Siena con los cristales marrones hacen que peguen con todo. En nuestra revisión vimos que el puente con forma de herradura hace que no se te escurran de la nariz para nada."],
    ["Ajuste Anatómico: Ideales para quienes buscan unas ", "Te quedan clavadas: Geniales si quieres unas "],
    [", asientan firmemente sobre el puente sin apretar ni deslizarse.", ", porque se quedan fijas en la nariz sin hacerte daño ni caerse."],
    ["Contraste Cálido: Sus lentes de cristal mineral marrón de 54 mm filtran la luz azul y realzan la percepción de profundidad en condiciones de luz cambiantes.", "Colores calentitos: Los cristales marrones de 54 mm te quitan la luz azul esa y hacen que veas todo mucho mejor cuando cambia el sol."],
    ["Robustez Mecánica: Las bisagras plegables reforzadas con la Flecha Suprema en el frente, el puente y las varillas soportan aperturas constantes demostrando una resistencia excepcional al uso diario.", "Duras como piedras: Las bisagras que se doblan y llevan la flecha esa en el frente y las patillas aguantan que las abras y cierres sin parar todos los días."],
    ["Las gafas 714 revolucionaron la óptica en los años sesenta como una evolución plegable del modelo 649. Steve McQueen las lució en El caso Thomas Crown (1968), catapultándolas a la fama mundial. Integran bisagras metálicas en el puente central y en las varillas para un plegado ágil en cuatro pasos. Puedes entrar a revisar ", "Las 714 fueron un boom en los años sesenta porque eran la versión que se doblaba de las 649. Steve McQueen se las puso en la peli de El caso Thomas Crown y las hizo famosas en todas partes. Llevan unas bisagras de metal en el puente y en las patillas para doblarlas rapidito en cuatro pasos. Puedes mirar "],
    [", pues la firma italiana mantiene viva esta edición especial con tiradas cuidadas al detalle.", ", porque los italianos las siguen haciendo con mucho mimo."],
    ["Steve McQueen proyectaba una elegancia natural; y las gafas Persol 714 que usaba en las películas no eran un simple adorno, encajaban directo con su actitud rebelde y convirtieron a ese modelo plegable en un clásico del diseño.", "El tío Steve tenía mucho estilo; y las gafas Persol 714 de las pelis no eran de adorno, le pegaban mucho con su rollo rebelde y por eso ahora son un clásico total."],
    ["La flecha de las gafas Persol certifica su autenticidad; denominada \"Supreme Arrow\" (Flecha Suprema), representa una calidad estructural innegable. Giuseppe Ratti diseñó este elemento inspirándose en las espadas de los guerreros antiguos. Más que un adorno, oculta las bisagras metálicas y une el frontal con las varillas, además de adornar las articulaciones de plegado en la edición Steve McQueen. La marca comenzó fabricando gafas duraderas para aviadores y pilotos de carreras, confiando en esta robusta pieza estructural que los coleccionistas revisan primero para descartar imitaciones.", "La flecha de las Persol es lo que te dice que son de verdad; la llaman la Flecha Suprema y es de una calidad que te mueres. El tal Giuseppe Ratti se inventó esto copiando las espadas de los guerreros de antes. Y no es solo para quedar bonito, tapa las bisagras y junta el frontal con las patillas. La marca empezó haciendo gafas para pilotos y confían a tope en esta pieza tan dura que los coleccionistas miran siempre para que no les cuelen falsas."],
    ["Advertencia sobre falsificaciones: Protege tu inversión al elegir distribuidores autorizados; abundan las imitaciones de baja calidad que podrían dañar tu vista.", "Ojo con las falsas: Cómpralas en tiendas de verdad; hay un montón de copias malas que te pueden fastidiar los ojos."],
    ["Persol hace todas sus gafas a mano en Lauriano, Turín (Italia), donde supervisan meticulosamente cada etapa. Ensamblar un modelo plegable 714 exige diez pasos de fabricación adicionales respecto a una montura estándar, confirmando que no tercerizan su producción. Cualquier grabado de otro país evidencia una falsificación. Evita estafas aprendiendo a inspeccionar estos detalles usando esta ", "Los de Persol hacen todas las gafas a mano en Turín, Italia, mirando con lupa cada cosita. Montar unas 714 de estas que se doblan lleva diez pasos más que unas normales, así que no se lo encargan a nadie más. Si pone que son de otro país, son falsísimas. Que no te timen y mírate esta "],
    ["Las gafas 714 Steve McQueen de Persol destacan en la pantalla grande por su ingenioso pliegue. Sin embargo, su tecnología óptica representa su mayor virtud. Las fabrican en Italia con materiales de primera calidad, donde los cristales protegen eficazmente y garantizan una visión cristalina considerando la ergonomía facial y las condiciones lumínicas del entorno.", "Las 714 de Steve McQueen molan en el cine por cómo se doblan. Pero lo mejor son los cristales que llevan. Las hacen en Italia con lo mejorcito, y los cristales te protegen de sobra y se ve súper claro, sin molestar en la cara y con cualquier luz."],
    ["Estas monturas resultan sumamente cómodas y ofrecen una claridad visual superior gracias a sus prestaciones ópticas:", "Estas gafas son comodísimas y se ve genial por todo esto:"],
    ["Protección UV total: Estos lentes bloquean el 100% de los rayos UVA y UVB, protegiendo los ojos y la piel periorbital. Esta barrera es indispensable en entornos de alta exposición solar para prevenir la fatiga visual.", "Te protegen a tope: Los cristales bloquean todos los rayos malos del sol, salvando tus ojos y la piel de alrededor. Esto es vital si hay mucho sol para que no te canses la vista."],
    ["Polarización avanzada en versiones seleccionadas: Las referencias polarizadas incorporan filtros especializados que suprimen los reflejos solares sobre superficies como agua o asfalto. Esta reducción del deslumbramiento disminuye la tensión ocular y mejora la percepción de profundidad al conducir.", "Polarizadas que flipas: Las que son polarizadas llevan filtros guapos que quitan los brillos del agua o de la calle. Eso hace que no te duelan los ojos y calcules mejor las distancias con el coche."],
    ["Tecnología de cristal mineral: A diferencia del plástico propenso a deformidades, el cristal óptico optimiza la transmisión lumínica para ofrecer formas definidas. Esto previene el cansancio ocular, incluso tras largas jornadas de exposición visual intensa.", "Cristales de cristal: Al revés que los de plástico que se deforman, el cristal de verdad deja pasar la luz súper bien para que lo veas todo clarito. Así no te cansas los ojos aunque las lleves puestas un montón de horas."],
    ["Cobertura facial optimizada: El diseño de gota estilo piloto de 54 mm se adapta ergonómicamente al rostro, bloqueando el viento y ampliando el campo visual periférico. Al evitar la entrada de luz lateral, ya no necesitas entrecerrar los ojos, asegurando confort prolongado.", "Te tapan toda la cara: La forma esa de gota de aviador se adapta de lujo a la cara, no te entra viento y ves un montón por los lados. Como no te entra luz por los laterales, no tienes que achinar los ojos y vas súper a gusto."],
    ["Las Persol ofrecen una nitidez asombrosa gracias a los cristales minerales Barberini, superando ampliamente a las alternativas plásticas sintéticas convencionales. Al fundir el vidrio se incorporan elementos de tierras raras como neodimio o praseodimio para filtrar selectivamente la luz. Este proceso realza los colores y logra una claridad inalcanzable para lentes comunes.", "Las Persol se ven increíble por los cristales esos Barberini, que le dan mil vueltas a los de plástico de toda la vida. Cuando hacen el cristal le meten cosas raras como neodimio para filtrar la luz. Eso hace que los colores destaquen y se vea de una forma que otras gafas ni sueñan."],
    ["Al contrastar esta avanzada tecnología óptica con los tradicionales lentes de plástico, destacan las siguientes ventajas:", "Si comparas esto tan moderno con los cristales de plástico de siempre, hay estas ventajas:"],
    ["Resistencia extrema a las rayaduras: El vidrio óptico puro soporta el desgaste diario manteniéndose intacto. Este material previene los antiestéticos rayones superficiales con mucha mayor eficacia que las lentes orgánicas.", "No se rayan ni a tiros: El cristal puro aguanta el trote de todos los días sin un rasguño. Es mucho mejor que el plástico para que no se te queden esas marcas tan feas."],
    ["Visión totalmente clara: Disfrutarás de una nitidez absoluta sin distorsiones cromáticas periféricas, manteniendo las proporciones exactas para un descanso visual completo.", "Visión de escándalo: Vas a ver todo súper nítido sin cosas raras por los bordes, viendo todo con su tamaño normal para que tus ojos descansen."],
    ["Realce de contraste avanzado: Las tierras raras equilibran el espectro cromático y eliminan el agotador resplandor amarillo, avivando los tonos primarios para una experiencia visual nítida.", "Contraste a tope: Esas tierras raras quitan el brillo amarillo ese que cansa tanto, haciendo que los colores resalten y lo veas todo clarísimo."],
    ["Durabilidad superior: Soportan cambios térmicos sin opacarse ni amarillear con el paso de los años, conservando intacta su transparencia original durante décadas.", "Duran una barbaridad: Aguantan el frío y el calor sin ponerse amarillas ni raras, y se quedan igual de transparentes por un montón de años."],
    ["Aspectos a tener en cuenta frente a los polímeros orgánicos convencionales:", "Cositas a tener en cuenta si lo comparas con el plástico de siempre:"],
    ["Mayor densidad: El cristal mineral tiene un peso ligeramente superior frente al policarbonato o la resina CR-39, razón por la cual Persol equilibra el chasis con el puente anatómico y las varillas Meflecto.", "Pesan un pelín más: El cristal pesa un poco más que el plástico ese, por eso Persol lo compensa con la forma de la nariz y las patillas Meflecto."],
    ["Cuidado ante impactos severos: Aunque el vidrio está templado químicamente, conviene guardarlo siempre en su estuche rígido para proteger tanto los cristales como el mecanismo de plegado.", "Cuidado con los golpes fuertes: Aunque el cristal es duro, mejor guardarlas en su caja dura para no cargarte ni los cristales ni lo de doblarlas."],
    ["Estas gafas de sol plegables representan una pieza de artesanía que exige un cuidado meticuloso para preservar su mecanismo. Sus componentes de acetato de celulosa natural, bisagras de acero y cristal mineral templado requieren una rutina de mantenimiento específica para evitar que el polvo o el sudor aceleren el desgaste de las articulaciones. Aplica estos pasos de limpieza regular para prolongar su vida útil:", "Estas gafas que se doblan son muy artesanales y hay que cuidarlas mucho para que no se estropee el mecanismo. Tienen acetato, bisagras de acero y cristal que necesitan sus mimos para que la mugre y el sudor no las fastidien. Haz esto para limpiarlas y que te duren más:"],
    ["Limpiar con agua templada: Evita limpiar los lentes en seco; el polvo adherido actúa como microlija causando rayones irreversibles. Enjuágalos con agua templada corriente, ya que el agua caliente deforma el armazón. Luego, aplica jabón neutro con los dedos y masajea suavemente los cristales y bordes.", "Límpialas con agua templadita: No las limpies en seco que la roña las raya para siempre. Pásalas por agua templada del grifo, que si está muy caliente se dobla la montura. Luego dales con jabón suave usando los dedos con cuidadito."],
    ["Secar sin dañar el antirreflejante: Tras el enjuague final, omite servilletas de papel o toallas comunes; sus fibras ásperas dañan la superficie. Utiliza el paño de microfibra limpio incluido, aplicándolo con movimientos suaves desde el centro hacia los bordes sin ejercer presión.", "Sécalas bien: Después del agua, no uses papel ni toallas de casa porque te las cargas. Usa el trapito que viene en la caja y dale suave desde el medio hacia fuera sin apretar mucho."],
    ["Cuidado de las bisagras plegables: Las articulaciones del puente nasal y del centro de las varillas requieren atención periódica. Examina estas uniones de acero mensualmente tras el lavado y asegúrate de secar cualquier resto de humedad. El mecanismo debe desplegarse con fluidez; nunca fuerces una bisagra atascada.", "Ojo con las bisagras: Lo que hace que se doblen por la nariz y las patillas hay que mirarlo a menudo. Échale un ojo todos los meses después de lavarlas y sécalas bien. Se tienen que abrir suavecito; no las fuerces si se atascan."],
    ["Limpieza de los cilindros Meflecto: Retira el sudor acumulado en las zonas flexibles de las varillas, pues su acidez puede afectar el brillo del metal con los años. Un pincel de cerdas suaves permite limpiar las ranuras para asegurar que los cilindros operen sin fricción.", "Limpia los chismes del Meflecto: Quítales el sudor de la parte que se dobla en las patillas, porque si no el metal se pone feo. Con un pincelito suave puedes limpiar los huecos para que funcione todo de maravilla."],
    ["Almacenamiento adecuado: Pliega las varillas siguiendo el orden natural del mecanismo y almacénalas en su estuche rígido exclusivo, evitando dejarlas en el salpicadero del vehículo, donde el calor extremo puede alterar el ajuste del acetato.", "Guárdalas donde toca: Dóblalas como es debido y mételas en su caja dura. No las dejes en el coche donde da todo el solazo porque el calor las deforma enteritas."],
    ["La popularidad de los modelos plegables genera réplicas que intentan imitar su estética, pero con ópticas deficientes y bisagras endebles. Revisa siempre estos cuatro sellos distintivos de la manufactura italiana:", "Como las gafas que se doblan gustan tanto, hay muchas copias que parecen iguales pero con cristales cutres y bisagras que se rompen. Mira siempre estos cuatro detallitos para saber que son de las italianas buenas:"],
    ["La Flecha Suprema a ras del acetato: Examina la montura bajo buena luz; el emblema metálico debe estar incrustado exactamente al mismo nivel del acetato tanto en los codos frontales como en la bisagra intermedia de la varilla. Al tacto debe sentirse completamente liso, sin bordes afilados ni restos de adhesivo.", "La Flecha esa bien puesta: Mírala con buena luz; la cosa esa de metal tiene que estar al mismo nivel que el acetato. Si pasas el dedo tiene que estar súper lisito, sin que pinche ni se note el pegamento."],
    ["Sistema de cilindros flexibles Meflecto: El diseño original integra inserciones metálicas dentro de la varilla logrando una alineación perfecta. Las varillas auténticas flexionan suavemente hacia afuera y recuperan su forma original con rapidez, mientras que las imitaciones emplean adornos superficiales rígidos.", "Lo de los cilindros Meflecto: Las de verdad llevan metales por dentro de la patilla que quedan de lujo. Se doblan para afuera suavecito y vuelven a su sitio rapidísimo, y las falsas solo llevan adornos por fuera que ni se mueven."],
    ["Grabados interiores y firma de Steve McQueen: El interior de las varillas incluye la inscripción \"Persol Hand Made in Italy\", el sello CE, la referencia \"PO0714SM\" y la reproducción de la firma de Steve McQueen, además del logotipo grabado en el cristal mineral derecho.", "Letras por dentro y la firma: Por dentro de la patilla pone \"Persol Hand Made in Italy\", lo del CE, lo de \"PO0714SM\" y la firma de Steve McQueen. Y también llevan el logo en el cristal derecho."],
    ["Peso y equilibrio del sistema plegable: Las gafas originales denotan un peso equilibrado derivado del cristal mineral Barberini y de sus bisagras internas de precisión, que cierran sin holguras laterales.", "Peso y que se doblen bien: Las de verdad tienen un peso que se nota por el cristal ese y por las bisagras buenas, y cuando las cierras no bailan ni nada."],
    ["El tacto del acetato de celulosa natural ofrece una suavidad superior y despliega tonalidades profundas como el clásico Terra di Siena o el carey Havana. Sin embargo, si la montura sufre una compresión accidental o un desajuste en el puente plegable, es fundamental seguir estas recomendaciones técnicas:", "El acetato ese natural es súper suave al tacto y tiene colores súper chulos como el Terra di Siena o el Havana. Pero si se te espachurran sin querer o se desajusta el puente, hazle caso a esto:"],
    ["Problema detectado: Desalineación de la bisagra central del puente, holgura en los tornillos de plegado o microfisuras en el acetato tras un impacto.", "El problema: La bisagra del medio torcida, los tornillos flojos o rajitas en el acetato de algún golpe."],
    ["Causas comunes: Compresión por guardar las gafas sin su estuche rígido, caídas accidentales o manipulación brusca al quitarse las gafas con una sola mano.", "Por qué pasa: Por meterlas por ahí sin su caja dura, que se te caigan al suelo o por quitártelas a lo bruto con una sola mano."],
    ["Solución experta y advertencia crítica: Nunca apliques pegamentos domésticos como cianoacrilato sobre el acetato ni intentes doblar en frío las bisagras metálicas del puente. Los adhesivos comerciales queman el polímero de algodón y bloquean irreversiblemente la bisagra central; acude siempre a un taller óptico especializado donde puedan termoajustar el acetato y calibrar la tornillería original.", "La solución y ojo con esto: No le eches Super Glue ni pegamentos de esos, ni intentes doblar el metal del puente a lo bruto. El pegamento te quema el plástico y te fastidia la bisagra para siempre; llévalas a una óptica para que te las calienten y te aprieten los tornillos de verdad."],
    ["Adquirir tus gafas Persol 714 Steve McQueen en una óptica autorizada como Óptica Bassol asegura su longevidad y respalda tu inversión con tres garantías fundamentales:", "Comprarte tus Persol 714 Steve McQueen en un sitio oficial como Óptica Bassol es la mejor jugada y te da tres garantías súper importantes:"],
    ["Autenticidad garantizada de fábrica: Los distribuidores oficiales entregan las gafas en su estuche exclusivo de la edición Steve McQueen con sus sellos de fábrica, paño de limpieza y certificado de autenticidad que avala su fabricación artesanal en Italia.", "Te garantizan que son de verdad: Las tiendas buenas te las dan en su caja especial de Steve McQueen con todo; el trapito, las etiquetas y el papelito que dice que están hechas a mano en Italia."],
    ["Servicio postventa y ajuste ergonómico especializado: El modelo 714, con su sistema Meflecto y sus cuatro puntos de plegado, se beneficia de una adaptación profesional a tu fisonomía. El óptico puede termoajustar los terminales de acetato y verificar la tensión de las bisagras para evitar puntos de presión nasal durante el día.", "Te las ajustan bien: Las 714 estas con sus bisagras molan más si te las ajustan para tu cara. El de la tienda te las puede calentar y mirar que no te aprieten en la nariz en todo el día."],
    ["Asesoramiento óptico personalizado: Elegir entre las lentes minerales azules clásicas (96/56), las verdes polarizadas (96/P1) o las marrones (96/73) resulta mucho más sencillo con el respaldo de especialistas que evalúan tus rutinas de conducción y sensibilidad lumínica.", "Te aconsejan de lujo: Elegir entre los cristales azules (96/56), los verdes esos (96/P1) o los marrones (96/73) es más fácil si te ayuda alguien que sabe de tus cosas y de cuánta luz soportas."]
];

let hum1Html = html;
for (const [oldStr, newStr] of hum1Replacements) {
    hum1Html = hum1Html.split(oldStr).join(newStr);
}
fs.writeFileSync(hum1File, hum1Html, 'utf8');

// surg1 replacements
const surg1Replacements = [
    ["gafas italianas que se doblan", "gafas italianas plegables"],
    ["cristales minerales tremendos", "cristales minerales excepcionales"],
    ["te quedan niqueladas", "te quedan impecables"],
    ["Miramos con lupa", "Examinamos con lupa"],
    ["sacar las tres opciones", "seleccionar las tres opciones"],
    ["no te comas la cabeza", "no te compliques la vida"],
    ["frikis del cine", "fanáticos del cine"],
    ["buenísimas del tirón", "excelentes de inmediato"],
    ["pega con todo", "combina con todo"],
    ["chulísimo", "atractivo"],
    ["Frontal de locos", "Frontal de lujo"],
    ["mil horas", "muchas horas"],
    ["Súper cómodas", "Muy cómodas"],
    ["Te quedan clavadas", "Te quedan perfectas"],
    ["Colores calentitos", "Colores cálidos"],
    ["un boom", "un éxito"],
    ["rapidito", "rápidamente"],
    ["El tío Steve", "El legendario Steve"],
    ["rollo rebelde", "estilo rebelde"],
    ["que te mueres", "de primera"],
    ["fastidiar", "dañar"],
    ["cada cosita", "cada detalle"],
    ["molan en el cine", "destacan en el cine"],
    ["Te protegen a tope", "Te protegen al máximo"],
    ["Polarizadas que flipas", "Polarizadas que impresionan"],
    ["Duran una barbaridad", "Duran una enormidad"]
];

let surg1Html = hum1Html;
for (const [oldStr, newStr] of surg1Replacements) {
    surg1Html = surg1Html.split(oldStr).join(newStr);
}
fs.writeFileSync(surg1File, surg1Html, 'utf8');

// surg2 replacements
const surg2Replacements = [
    ["gafas italianas plegables", "gafas plegables italianas"],
    ["cristales minerales excepcionales", "cristales minerales formidables"],
    ["lucen un diseño", "exhiben un diseño"],
    ["te quedan impecables", "te asientan impecables"],
    ["Examinamos con lupa", "Analizamos con lupa"],
    ["seleccionar las tres opciones", "escoger las tres opciones"],
    ["fanáticos del cine", "entusiastas del cine"],
    ["excelentes de inmediato", "notables de inmediato"],
    ["combina con todo", "armoniza con todo"],
    ["Frontal de lujo", "Frontal distinguido"],
    ["muchas horas", "extensas horas"],
    ["Muy cómodas", "Sumamente cómodas"],
    ["Te quedan perfectas", "Te asientan perfectas"],
    ["Colores cálidos", "Tonos cálidos"],
    ["un éxito", "un triunfo"],
    ["rápidamente", "ágilmente"],
    ["estilo rebelde", "carácter rebelde"],
    ["de primera", "de excelencia"],
    ["dañar", "perjudicar"],
    ["cada detalle", "cada aspecto"],
    ["destacan en el cine", "resaltan en el cine"],
    ["Te protegen al máximo", "Te resguardan al máximo"],
    ["Duran una enormidad", "Perduran una enormidad"]
];

let surg2Html = surg1Html;
for (const [oldStr, newStr] of surg2Replacements) {
    surg2Html = surg2Html.split(oldStr).join(newStr);
}
fs.writeFileSync(surg2File, surg2Html, 'utf8');

console.log("Done");
