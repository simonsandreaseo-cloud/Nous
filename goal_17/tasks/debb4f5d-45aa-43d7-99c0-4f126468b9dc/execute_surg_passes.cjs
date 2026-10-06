const fs = require('fs');
const path = require('path');

const dir = __dirname;
const baseFilePath = path.join(dir, 'latest_base.html');
const pass1FilePath = path.join(dir, 'surg_pass_1.html');
const pass2FilePath = path.join(dir, 'surg_pass_2.html');
const pass3FilePath = path.join(dir, 'surg_pass_3.html');

function wordLevenshtein(words1, words2) {
    const m = words1.length;
    const n = words2.length;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (words1[i - 1] === words2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = 1 + Math.min(
                    dp[i - 1][j],
                    dp[i][j - 1],
                    dp[i - 1][j - 1]
                );
            }
        }
    }
    return dp[m][n];
}

function wordLCS(words1, words2) {
    const m = words1.length;
    const n = words2.length;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (words1[i - 1] === words2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }
    return dp[m][n];
}

// PASS 1 REPLACEMENTS (applied on latest_base.html)
const pass1_replacements = [
    // Chunk 1 (92w, max 4)
    ["en la tele.", "en televisión."],
    // Chunk 3 (85w, max 4)
    ["según cuál agarres,", "según cuál elijas,"],
    // Chunk 5 (101w, max 5)
    ["compras las <strong>Persol", "adquieres las <strong>Persol"],
    // Chunk 6 (44w, max 2)
    ["le clavan la conocida", "le colocan la conocida"],
    // Chunk 7 (32w, max 1)
    ["Le ponen cristal mineral", "Le colocan cristal mineral"],
    // Chunk 8 (34w, max 1)
    ["Este vidrio bloquea el", "Este cristal bloquea el"],
    // Chunk 12 (68w, max 3)
    ["gafas más chicas que", "gafas más pequeñas que"],
    // Chunk 13 (66w, max 3)
    ["barra arriba,", "barra superior,"],
    // Chunk 14 (37w, max 1)
    ["curva redonda muy tranqui,", "curva redonda muy suave,"],
    // Chunk 15 (47w, max 2)
    ["carey manchado (Havana 24)", "carey veteado (Havana 24)"],
    // Chunk 18 (76w, max 3)
    ["bien los cachetes o", "bien las mejillas o"],
    // Chunk 19 (103w, max 5)
    ["más petisos de alto,", "más reducidos de alto,"],
    // Chunk 39 (26w, max 1)
    ["pierda su buena facha.\"", "pierda su buena presencia.\""],
    // Chunk 54 (64w, max 3)
    ["persona grande.</p>", "persona mayor.</p>"],
    // Chunk 55 (113w, max 5)
    ["saca la marca de lejos.", "reconoce la marca de lejos."],
    // Chunk 57 (96w, max 4)
    ["en la cara. Lo mejor", "en el rostro. Lo mejor"],
    // Chunk 58 (94w, max 4)
    ["a un casamiento o si", "a una boda o si"],
    // Chunk 60 (68w, max 3)
    ["te deja doliendo la vista.", "te deja fatigada la vista."],
    // Chunk 61 (69w, max 3)
    ["viene bárbaro cuando manejas", "viene genial cuando manejas"],
    // Chunk 62 (30w, max 1)
    ["cuidar los ojos cuando", "proteger los ojos cuando"],
    // Chunk 63 (63w, max 3)
    ["sol pega derecho.", "sol incide directo."],
    // Chunk 64 (68w, max 3)
    ["a tu casa a la noche no", "a tu casa por la noche no"],
    // Chunk 65 (65w, max 3)
    ["no miente con los tonos,", "no engaña con los tonos,"],
    // Chunk 67 (69w, max 3)
    ["rayos malos del sol se", "rayos nocivos del sol se"],
    // Chunk 68 (98w, max 4)
    ["frenan en seco el 100%", "frenan por completo el 100%"],
    // Chunk 70 (144w, max 7)
    ["agua de una pileta,", "agua de una piscina,"],
    // Chunk 72 (55w, max 2)
    ["pantalla del celular o", "pantalla del teléfono o"],
    // Chunk 73 (79w, max 3)
    ["ver clarito el", "ver claramente el"],
    // Chunk 75 (81w, max 4)
    ["Meter una lámina polarizada", "Integrar una lámina polarizada"],
    // Chunk 84 (23w, max 1)
    ["rebotan del piso o", "rebotan del suelo o"],
    // Chunk 86 (22w, max 1)
    ["Manejar en pista o", "Conducir en pista o"],
    // Chunk 87 (22w, max 1)
    ["manejar horas en autopistas", "conducir horas en autopistas"],
    // Chunk 89 (79w, max 3)
    ["fábricas grandes de ahora usan", "fábricas grandes de hoy usan"],
    // Chunk 90 (83w, max 4)
    ["ves todo con filo,", "ves todo con nitidez,"],
    // Chunk 92 (92w, max 4)
    ["en la planta vieja de", "en la planta histórica de"],
    // Chunk 94 (126w, max 6)
    ["banca el uso duro", "soporta el uso continuo"],
    // Chunk 96 (69w, max 3)
    ["calle por ese dibujo.", "calle por ese grabado."],
    // Chunk 97 (80w, max 3)
    ["la misma pinta de siempre.", "el mismo porte de siempre."],
    // Chunk 98 (63w, max 3)
    ["abra durita sin", "abra firme sin"],
    // Chunk 100 (124w, max 6)
    ["comodísimas por culpa del sistema", "comodísimas gracias al sistema"],
    // Chunk 103 (45w, max 2)
    ["caminar por el barrio.", "caminar por la ciudad."],
    // Chunk 104 (33w, max 1)
    ["color carey bien italiana", "color carey muy italiana"],
    // Chunk 105 (35w, max 1)
    ["pintados de azul oscuro.", "tintados de azul oscuro."],
    // Chunk 106 (40w, max 1)
    ["vidrios especiales más modernos,", "cristales especiales más modernos,"],
    // Chunk 112 (24w, max 1)
    ["te deja una pinta seria", "te deja una imagen seria"],
    // Chunk 113 (23w, max 1)
    ["esa onda italiana clásica", "esa línea italiana clásica"],
    // Chunk 115 (25w, max 1)
    ["Queda bárbaro en caras", "Queda excelente en caras"],
    // Chunk 116 (27w, max 1)
    ["marrón levantan las pieles", "marrón favorecen las pieles"],
    // Chunk 118 (22w, max 1)
    ["prenda del ropero y", "prenda del armario y"],
    // Chunk 119 (23w, max 1)
    ["mejor los rayoncitos si", "mejor los rasguños si"],
    // Chunk 122 (21w, max 1)
    ["manchas del marco pueden", "manchas del armazón pueden"],
    // Chunk 124 (85w, max 4)
    ["réplica trucha que se", "réplica falsificada que se"],
    // Chunk 125 (24w, max 1)
    ["correo no te aplaste los", "correo no te dañe los"],
    // Chunk 126 (29w, max 1)
    ["lo tiras tranquilo adentro", "lo llevas tranquilo adentro"],
    // Chunk 127 (24w, max 1)
    ["gamuza finita para sacar", "gamuza delicada para sacar"],
    // Chunk 128 (25w, max 1)
    ["un papelito con consejos", "un folleto con consejos"],
    // Chunk 130 (29w, max 1)
    ["estos acabados chicos:", "estos acabados menores:"],
    // Chunk 131 (60w, max 2)
    ["unas PO0202S verdaderas notas", "unas PO0202S auténticas notas"],
    // Chunk 132 (47w, max 2)
    ["El dibujo de metal en", "El emblema de metal en"],
    // Chunk 133 (54w, max 2)
    ["quedan derechitas. Si", "quedan alineadas. Si"],
    // Chunk 134 (33w, max 1)
    ["aire ni chueca.", "aire ni torcida."],
    // Chunk 136 (25w, max 1)
    ["nuevas mira con buena", "nuevas examina con buena"],
    // Chunk 137 (56w, max 2)
    ["puente y la pata (57-18-145),", "puente y la varilla (57-18-145),"],
    // Chunk 138 (48w, max 2)
    ["arriba del vidrio derecho porque", "arriba del cristal derecho porque"],
    // Chunk 139 (44w, max 2)
    ["de la pata derecha tiene", "de la varilla derecha tiene"],
    // Chunk 140 (38w, max 1)
    ["sin bailar para los costados.", "sin oscilar para los costados."]
];

// PASS 2 REPLACEMENTS (applied on surg_pass_1.html)
const pass2_replacements = [
    // Chunk 1 (92w, max 4)
    ["le meten lentes de", "le suman lentes de"],
    // Chunk 3 (85w, max 4)
    ["la onda que tiene", "el estilo que tiene"],
    // Chunk 5 (101w, max 5)
    ["un huequito como de", "una abertura como de"],
    // Chunk 6 (44w, max 2)
    ["que es bien grueso y", "que es muy grueso y"],
    // Chunk 7 (32w, max 1)
    ["impecable en la calle,", "impecable en la vía,"],
    // Chunk 8 (34w, max 1)
    ["sales tranquilo al mediodía", "sales seguro al mediodía"],
    // Chunk 12 (68w, max 3)
    ["se nota bien distinto cuando", "se nota muy distinto cuando"],
    // Chunk 13 (66w, max 3)
    ["La pasta no te deja", "El acetato no te deja"],
    // Chunk 14 (37w, max 1)
    ["acomodan mejor la cara", "sientan mejor la cara"],
    // Chunk 15 (47w, max 2)
    ["con los vidrios verdes minerales.", "con los cristales verdes minerales."],
    // Chunk 18 (76w, max 3)
    ["bastante parte de la cara,", "buena parte de la cara,"],
    // Chunk 19 (103w, max 5)
    ["fabrican con pasta negra italiana", "fabrican con acetato negro italiano"],
    // Chunk 39 (26w, max 1)
    ["cosas funcionen perfecto sin", "cosas marchen perfecto sin"],
    // Chunk 54 (64w, max 3)
    ["colores y les salió redondo.", "colores y les resultó impecable."],
    // Chunk 55 (113w, max 5)
    ["juntos te arregla la cara enseguida,", "juntos te favorece la cara enseguida,"],
    // Chunk 57 (96w, max 4)
    ["y el dibujo de la gafa resalta", "y el diseño de la gafa resalta"],
    // Chunk 58 (94w, max 4)
    ["sales en remera a tomar", "sales en camiseta a tomar"],
    // Chunk 60 (68w, max 3)
    ["ese material aguanta los años", "ese material resiste los años"],
    // Chunk 61 (69w, max 3)
    ["no te disfraza los colores", "no te altera los colores"],
    // Chunk 62 (30w, max 1)
    ["cuando estás afuera,", "cuando estás fuera,"],
    // Chunk 63 (63w, max 3)
    ["El vidrio verde acomoda los", "El vidrio verde equilibra los"],
    // Chunk 64 (68w, max 3)
    ["dejas de arrugar la frente por", "evitas arrugar la frente por"],
    // Chunk 65 (65w, max 3)
    ["muestra el pasto, el cielo", "muestra el césped, el cielo"],
    // Chunk 67 (69w, max 3)
    ["el papel de garantía original", "el certificado de garantía original"],
    // Chunk 68 (98w, max 4)
    ["ahorras problemas feos cuando", "ahorras afecciones visuales cuando"],
    // Chunk 70 (144w, max 7)
    ["deja pasar solo la luz parada que", "deja pasar solo la luz vertical que"],
    // Chunk 72 (55w, max 2)
    ["trae vidrios verdes comunes", "trae cristales verdes comunes"],
    // Chunk 73 (79w, max 3)
    ["viajes largos por ruta.", "viajes largos por carretera."],
    // Chunk 75 (81w, max 4)
    ["después no veas las cosas movidas.", "después no percibas las cosas movidas."],
    // Chunk 84 (23w, max 1)
    ["Quita del todo los", "Elimina del todo los"],
    // Chunk 86 (22w, max 1)
    ["LED sin problema.</p>", "LED sin inconveniente.</p>"],
    // Chunk 87 (22w, max 1)
    ["donde el sol quema el asfalto", "donde el sol calienta el asfalto"],
    // Chunk 89 (79w, max 3)
    ["siglo prendiendo los hornos para", "siglo encendiendo los hornos para"],
    // Chunk 90 (83w, max 4)
    ["Senna cuando corría a fondo o", "Senna cuando competía a fondo o"],
    // Chunk 92 (92w, max 4)
    ["entre los fierros de carrera de", "entre los bólidos de carrera de"],
    // Chunk 94 (126w, max 6)
    ["sin doblarse ni quedar grande,", "sin deformarse ni quedar grande,"],
    // Chunk 96 (69w, max 3)
    ["Ese pedazo de acero no lo", "Esa pieza de acero no lo"],
    // Chunk 97 (80w, max 3)
    ["los técnicos retocaron un poquito la", "los técnicos ajustaron sutilmente la"],
    // Chunk 98 (63w, max 3)
    ["raspe ningún borde salido y", "raspe ningún borde áspero y"],
    // Chunk 100 (124w, max 6)
    ["eran duras como un alambre.", "eran rígidas como un alambre."],
    // Chunk 103 (45w, max 2)
    ["trae los vidrios verdes minerales", "trae los cristales verdes minerales"],
    // Chunk 104 (33w, max 1)
    ["le quita seriedad al", "le resta seriedad al"],
    // Chunk 105 (35w, max 1)
    ["Turín y le suma unos lentes", "Turín y le añade unos lentes"],
    // Chunk 106 (40w, max 1)
    ["sales al sol fuerte y", "sales al sol intenso y"],
    // Chunk 112 (24w, max 1)
    ["Cae muy bien en", "Encaja muy bien en"],
    // Chunk 113 (23w, max 1)
    ["ropa suelta de diario,", "ropa cómoda de diario,"],
    // Chunk 115 (25w, max 1)
    ["Queda excelente en caras blancas", "Queda excelente en pieles blancas"],
    // Chunk 116 (27w, max 1)
    ["Le sienta bien a todo", "Le sienta genial a todo"],
    // Chunk 118 (22w, max 1)
    ["armario y se ve elegante", "armario y se aprecia elegante"],
    // Chunk 119 (23w, max 1)
    ["manchas de la pasta nunca salen", "manchas de la montura nunca salen"],
    // Chunk 122 (21w, max 1)
    ["ropa con cuadros grandes", "prendas con cuadros grandes"],
    // Chunk 124 (85w, max 4)
    ["Gastar una buena plata en", "Invertir una buena suma en"],
    // Chunk 125 (24w, max 1)
    ["cartón grueso bien firme", "cartón grueso muy firme"],
    // Chunk 126 (29w, max 1)
    ["cuidar los vidrios minerales de", "cuidar los cristales minerales de"],
    // Chunk 127 (24w, max 1)
    ["manchas de grasitud de los", "manchas de grasa de los"],
    // Chunk 128 (25w, max 1)
    ["dice que las armaron en Italia", "dice que las fabricaron en Italia"],
    // Chunk 130 (29w, max 1)
    ["copias baratas siempre fallan", "copias económicas siempre fallan"],
    // Chunk 131 (60w, max 2)
    ["pasta de acetato es bien maciza", "pasta de acetato es muy maciza"],
    // Chunk 132 (47w, max 2)
    ["quedar clavado a la misma", "quedar alineado a la misma"],
    // Chunk 133 (54w, max 2)
    ["metal metidas adentro de las", "metal insertadas adentro de las"],
    // Chunk 134 (33w, max 1)
    ["las dos patas tienen que", "las dos varillas tienen que"],
    // Chunk 136 (25w, max 1)
    ["quedarte tranquilo con tus", "quedarte seguro con tus"],
    // Chunk 137 (56w, max 2)
    ["está el dibujo de la serie Senna.", "está el emblema de la serie Senna."],
    // Chunk 138 (48w, max 2)
    ["es pintura y no sale.", "es pintura y no desaparece."],
    // Chunk 139 (44w, max 2)
    ["letras son bien claritas y parejas", "letras son muy nítidas y parejas"],
    // Chunk 140 (38w, max 1)
    ["sientes que corren suave pero", "sientes que deslizan suave pero"]
];

// PASS 3 REPLACEMENTS (applied on surg_pass_2.html)
const pass3_replacements = [
    // Chunk 1 (92w, max 4)
    ["y el dibujo de Senna en la punta izquierda.", "y el grabado de Senna en la punta izquierda."],
    // Chunk 3 (85w, max 4)
    ["vamos a mirar de cerca las", "vamos a examinar de cerca las"],
    // Chunk 5 (101w, max 5)
    ["patillas se abren suave gracias", "patillas se abren suavemente gracias"],
    // Chunk 6 (44w, max 2)
    ["lo moldean y lo pule a mano", "lo moldean y lo pulen a mano"],
    // Chunk 7 (32w, max 1)
    ["adentro llevan un baño químico", "adentro llevan un tratamiento químico"],
    // Chunk 8 (34w, max 1)
    ["porque viene con filtro UV400,", "porque cuenta con filtro UV400,"],
    // Chunk 12 (68w, max 3)
    ["italiana te topas rápido con el", "italiana te encuentras rápido con el"],
    // Chunk 13 (66w, max 3)
    ["se apoyan parejos a los costados", "se apoyan uniformes a los costados"],
    // Chunk 14 (37w, max 1)
    ["la gente las elige mucho", "la gente las prefiere mucho"],
    // Chunk 15 (47w, max 2)
    ["le da otro calor a la piel", "le da otra calidez a la piel"],
    // Chunk 18 (76w, max 3)
    ["corte rectangular bien marcado que", "corte rectangular muy marcado que"],
    // Chunk 19 (103w, max 5)
    ["ir manejando en la ruta sin", "ir conduciendo en la carretera sin"],
    // Chunk 39 (26w, max 1)
    ["pierda su buena presencia.\"", "pierda su gran presencia.\""],
    // Chunk 54 (64w, max 3)
    ["lentes finos que te dejaran", "lentes distinguidos que te dejaran"],
    // Chunk 55 (113w, max 5)
    ["materiales que duran.", "materiales que perduran."],
    // Chunk 57 (96w, max 4)
    ["los artesanos frotan los marcos", "los artesanos pulen los marcos"],
    // Chunk 58 (94w, max 4)
    ["o te pones colorado con el", "o te pones rojo con el"],
    // Chunk 60 (68w, max 3)
    ["en otros lados. Los", "en otras firmas. Los"],
    // Chunk 61 (69w, max 3)
    ["La gente que armó la serie", "El equipo que armó la serie"],
    // Chunk 62 (30w, max 1)
    ["apenas te las pones:", "apenas te las pruebas:"],
    // Chunk 63 (63w, max 3)
    ["te ayuda un montón para manejar", "te ayuda muchísimo para manejar"],
    // Chunk 64 (68w, max 3)
    ["tampoco te arden ni te lloran", "tampoco te escuecen ni te lloran"],
    // Chunk 65 (65w, max 3)
    ["se vea rara o triste,", "se perciba rara o triste,"],
    // Chunk 67 (69w, max 3)
    ["la pupila se abre grande creyendo", "la pupila se dilata creyendo"],
    // Chunk 68 (98w, max 4)
    ["caja dice claro que las", "caja indica claro que las"],
    // Chunk 70 (144w, max 7)
    ["frena en seco los chispazos", "frena por completo los chispazos"],
    // Chunk 72 (55w, max 2)
    ["digital del auto sin que", "digital del vehículo sin que"],
    // Chunk 73 (79w, max 3)
    ["andar en lancha o hacer", "navegar en lancha o hacer"],
    // Chunk 75 (81w, max 4)
    ["con tu bolsillo y tus salidas:", "con tu presupuesto y tus salidas:"],
    // Chunk 84 (23w, max 1)
    ["los bordes de las cosas.", "los contornos de las cosas."],
    // Chunk 86 (22w, max 1)
    ["usarlas todos los días aunque", "llevarlas todos los días aunque"],
    // Chunk 87 (22w, max 1)
    ["y caminar por la arena", "y andar por la arena"],
    // Chunk 89 (79w, max 3)
    ["Persol se planta en seguir", "Persol se decide a seguir"],
    // Chunk 90 (83w, max 4)
    ["Persol te da una vista", "Persol te ofrece una vista"],
    // Chunk 92 (92w, max 4)
    ["y miran cada marco con lupa.", "y examinan cada marco con lupa."],
    // Chunk 94 (126w, max 6)
    ["petróleo, no te brota la piel", "petróleo, no te irrita la piel"],
    // Chunk 96 (69w, max 3)
    ["fierro que agarra la parte", "metal que agarra la parte"],
    // Chunk 97 (80w, max 3)
    ["bisagra trabara más fuerte,", "bisagra cerrara más firme,"],
    // Chunk 98 (63w, max 3)
    ["flecha está hundido justo al ras", "flecha está insertado justo al ras"],
    // Chunk 100 (124w, max 6)
    ["unos cilindros chiquitos de nailon", "unos cilindros diminutos de nailon"],
    // Chunk 103 (45w, max 2)
    ["que no cambian los colores de", "que no alteran los colores de"],
    // Chunk 104 (33w, max 1)
    ["con el mismo vidrio verde clásico,", "con el mismo cristal verde clásico,"],
    // Chunk 105 (35w, max 1)
    ["Viene con un acetato color", "Cuenta con un acetato color"],
    // Chunk 106 (40w, max 1)
    ["también corta los reflejos por", "también elimina los reflejos por"],
    // Chunk 112 (24w, max 1)
    ["una imagen seria y prolija.", "una presencia seria y prolija."],
    // Chunk 113 (23w, max 1)
    ["lino, tiene esa línea", "lino, luce esa línea"],
    // Chunk 115 (25w, max 1)
    ["estás quemado del sol,", "estás bronceado del sol,"],
    // Chunk 116 (27w, max 1)
    ["sin endurecer la mirada.", "sin endurecer la expresión."],
    // Chunk 118 (22w, max 1)
    ["elegante sin gritar.", "elegante sin exagerar."],
    // Chunk 119 (23w, max 1)
    ["ilumina los ojos y esconde", "realza los ojos y esconde"],
    // Chunk 122 (21w, max 1)
    ["pueden recargar un poco la", "pueden saturar un poco la"],
    // Chunk 124 (85w, max 4)
    ["da mucha bronca que te", "da mucha molestia que te"],
    // Chunk 125 (24w, max 1)
    ["lentes en el camino.", "lentes en el traslado."],
    // Chunk 126 (29w, max 1)
    ["bolso o del auto.", "bolso o del coche."],
    // Chunk 127 (24w, max 1)
    ["sin rayar el baño antirreflejante", "sin rayar el tratamiento antirreflejante"],
    // Chunk 128 (25w, max 1)
    ["folleto sellado que dice que", "folleto sellado que certifica que"],
    // Chunk 130 (29w, max 1)
    ["revisar con paciencia las", "examinar con paciencia las"],
    // Chunk 131 (60w, max 2)
    ["ruidos por fricción", "crujidos por fricción"],
    // Chunk 132 (47w, max 2)
    ["porque son falsas.</p>", "porque son réplicas.</p>"],
    // Chunk 133 (54w, max 2)
    ["y son durísimas.</p>", "y son rígidas.</p>"],
    // Chunk 134 (33w, max 1)
    ["quede colgando en el aire", "quede suspendida en el aire"],
    // Chunk 136 (25w, max 1)
    ["con buena luz estas", "con adecuada luz estas"],
    // Chunk 137 (56w, max 2)
    ["Da vuelta la patilla izquierda", "Gira la patilla izquierda"],
    // Chunk 138 (48w, max 2)
    ["arriba del cristal derecho porque", "superior del cristal derecho porque"],
    // Chunk 139 (44w, max 2)
    ["muy nítidas y parejas sin", "muy nítidas y uniformes sin"],
    // Chunk 140 (38w, max 1)
    ["bisagras que doblan las patillas", "bisagras que articulan las patillas"]
];

function applyReplacements(content, replacements, passLabel) {
    let modified = content;
    for (const [target, replacement] of replacements) {
        if (!modified.includes(target)) {
            throw new Error(`[${passLabel}] Target string not found in content: "${target}"`);
        }
        modified = modified.replace(target, replacement);
    }
    return modified;
}

function verifyStrictLimits(prevContent, newContent, passLabel) {
    const regex = /(<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>|<p[^>]*>[\s\S]*?<\/p>|<li[^>]*>[\s\S]*?<\/li>|<blockquote[^>]*>[\s\S]*?<\/blockquote>|<th[^>]*>[\s\S]*?<\/th>|<td[^>]*>[\s\S]*?<\/td>)/gi;

    const getChunks = (html) => {
        const chunks = [];
        let m;
        const re = new RegExp(regex);
        while ((m = re.exec(html)) !== null) {
            chunks.push(m[0]);
        }
        return chunks;
    };

    const prevChunks = getChunks(prevContent);
    const newChunks = getChunks(newContent);

    if (prevChunks.length !== newChunks.length) {
        throw new Error(`[${passLabel}] Chunk count mismatch: ${prevChunks.length} vs ${newChunks.length}`);
    }

    let maxLevRatio = 0;
    let maxLcsRatio = 0;
    let editedChunksCount = 0;

    for (let i = 0; i < prevChunks.length; i++) {
        const pRaw = prevChunks[i];
        const nRaw = newChunks[i];

        const pText = pRaw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        const nText = nRaw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

        const pWords = pText.split(/\s+/).filter(Boolean);
        const nWords = nText.split(/\s+/).filter(Boolean);

        const m = pWords.length;
        if (m === 0) continue;

        const levDist = wordLevenshtein(pWords, nWords);
        const lcs = wordLCS(pWords, nWords);
        const lcsEdits = m - lcs;

        const levRatio = levDist / m;
        const lcsRatio = lcsEdits / m;

        if (levDist > 0) {
            editedChunksCount++;
        }

        if (levRatio > maxLevRatio) maxLevRatio = levRatio;
        if (lcsRatio > maxLcsRatio) maxLcsRatio = lcsRatio;

        if (levRatio >= 0.05 || lcsRatio >= 0.05) {
            throw new Error(`[${passLabel}] STRICT LIMIT VIOLATION on Chunk ${i}: Lev=${(levRatio * 100).toFixed(2)}%, LCS=${(lcsRatio * 100).toFixed(2)}% (Max permitted < 5.00%).\nPrev words: ${m}, LevDist: ${levDist}\nPrev: "${pText}"\nNext: "${nText}"`);
        }
    }

    // Verify HTML tags
    const getTags = str => (str.match(/<[^>]+>/g) || []).map(t => t.toLowerCase());
    const prevTags = getTags(prevContent);
    const newTags = getTags(newContent);

    if (prevTags.length !== newTags.length) {
        throw new Error(`[${passLabel}] HTML tag count mismatch: ${prevTags.length} vs ${newTags.length}`);
    }
    for (let t = 0; t < prevTags.length; t++) {
        if (prevTags[t] !== newTags[t]) {
            throw new Error(`[${passLabel}] Tag mismatch at index ${t}: "${prevTags[t]}" vs "${newTags[t]}"`);
        }
    }

    console.log(`[${passLabel}] Verified: ${editedChunksCount} chunks edited. Max Lev=${(maxLevRatio * 100).toFixed(2)}%, Max LCS=${(maxLcsRatio * 100).toFixed(2)}%. All ${prevTags.length} HTML tags 100% identical.`);
}

console.log('--- EXECUTING SEQUENTIAL PASSES OF EDICIÓN QUIRÚRGICA ---');

// STEP 1: Read latest_base.html, apply Pass 1, save to surg_pass_1.html
console.log('\n1. Reading latest_base.html and executing Pass 1...');
const baseHtml = fs.readFileSync(baseFilePath, 'utf8');
const pass1Html = applyReplacements(baseHtml, pass1_replacements, 'Pass 1');
verifyStrictLimits(baseHtml, pass1Html, 'Pass 1');
fs.writeFileSync(pass1FilePath, pass1Html, 'utf8');
console.log(`   Saved: ${pass1FilePath} (${fs.statSync(pass1FilePath).size} bytes)`);

// STEP 2: Read surg_pass_1.html, apply Pass 2, save to surg_pass_2.html
console.log('\n2. Reading surg_pass_1.html and executing Pass 2...');
const readPass1Html = fs.readFileSync(pass1FilePath, 'utf8');
const pass2Html = applyReplacements(readPass1Html, pass2_replacements, 'Pass 2');
verifyStrictLimits(readPass1Html, pass2Html, 'Pass 2');
fs.writeFileSync(pass2FilePath, pass2Html, 'utf8');
console.log(`   Saved: ${pass2FilePath} (${fs.statSync(pass2FilePath).size} bytes)`);

// STEP 3: Read surg_pass_2.html, apply Pass 3, save to surg_pass_3.html
console.log('\n3. Reading surg_pass_2.html and executing Pass 3...');
const readPass2Html = fs.readFileSync(pass2FilePath, 'utf8');
const pass3Html = applyReplacements(readPass2Html, pass3_replacements, 'Pass 3');
verifyStrictLimits(readPass2Html, pass3Html, 'Pass 3');
fs.writeFileSync(pass3FilePath, pass3Html, 'utf8');
console.log(`   Saved: ${pass3FilePath} (${fs.statSync(pass3FilePath).size} bytes)`);

console.log('\n--- VERIFYING SAVED FILES ON DISK ---');
[pass1FilePath, pass2FilePath, pass3FilePath].forEach((f, idx) => {
    const content = fs.readFileSync(f, 'utf8');
    const bytes = fs.readFileSync(f);
    // Check BOM: UTF-8 BOM is EF BB BF
    const hasBOM = bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF;
    // Check double encoded characters like Ã¡, Ã©, etc.
    const doubleEncoded = /Ã[¡±³º©ª®¯°±²³´µ¶·¸¹º»¼½¾¿]/.test(content);
    console.log(`Pass ${idx+1} (${path.basename(f)}):`);
    console.log(`  Size: ${bytes.length} bytes`);
    console.log(`  Has BOM: ${hasBOM ? 'YES (Error)' : 'NO (Proper UTF-8)'}`);
    console.log(`  Double Encoded Artifacts: ${doubleEncoded ? 'YES (Error)' : 'NONE (Clean)'}`);
    if (hasBOM || doubleEncoded) {
        throw new Error(`Encoding issue detected in ${f}`);
    }
});

console.log('\nALL 3 FILES GENERATED AND VERIFIED SUCCESSFULLY IN UTF-8!');
