const fs = require('fs');

const content = fs.readFileSync('latest_base.html', 'utf8');
const lines = content.split('\n');

function wordLevenshtein(a, b) {
    const m = a.length;
    const n = b.length;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (a[i - 1] === b[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
            }
        }
    }
    return dp[m][n];
}

function extractTags(str) {
    return (str.match(/<[^>]+>/g) || []).join('');
}

function getWords(line) {
    return line.replace(/<[^>]+>/g, '').trim().split(/\s+/).filter(Boolean);
}

// Map of lineNum -> { p1: [from, to], p2: [from, to], p3: [from, to] }
const edits = {
    2: {
        p1: ["rápido notas la calidad", "enseguida notas la calidad"],
        p2: ["la verdad son muy cómodas,", "en verdad son muy cómodas,"],
        p3: ["atrae bastante la atención.", "capta bastante la atención."]
    },
    5: {
        p1: ["juntaron velocidad con diseños", "unieron velocidad con diseños"],
        p2: ["puedes usar todos los días.", "puedes emplear todos los días."],
        p3: ["exhiben todo ese trabajo.", "reflejan todo ese trabajo."]
    },
    6: {
        p1: ["Usan materiales que no pierden", "Emplean materiales que no pierden"],
        p2: ["para manejar con todo el sol", "para conducir con todo el sol"],
        p3: ["que resaltan en el catálogo.", "que sobresalen en el catálogo."]
    },
    9: {
        p1: ["las puedes llevar puestas muchas", "las puedes lucir puestas muchas"],
        p2: ["rasgos de la cara.", "rasgos del rostro."],
        p3: ["soportan el uso diario", "resisten el uso diario"]
    },
    10: {
        p1: ["si volteas rápido.", "si giras rápido."],
        p2: ["las imágenes por las orillas,", "las imágenes en los bordes,"],
        p3: ["para manejar a diario o", "para conducir a diario o"]
    },
    12: {
        p1: ["puedes mirar toda la ruta", "puedes divisar toda la ruta"],
        p2: ["el aire casi ni choca contra", "el aire casi no choca contra"],
        p3: ["y el avance no se interrumpe.", "y el progreso no se interrumpe."]
    },
    13: {
        p1: ["Viene con un ajuste flexible", "Cuenta con un ajuste flexible"],
        p2: ["se adaptan al rostro.", "se amoldan al rostro."],
        p3: ["sin romperse,", "sin fracturarse,"]
    },
    14: {
        p1: ["Soportan el calor y el frío,", "Resisten el calor y el frío,"],
        p2: ["olvidadas en el auto y no", "olvidadas en el coche y no"],
        p3: ["manteniendo siempre su estructura", "conservando siempre su estructura"]
    },
    20: {
        p1: ["para ir rápido,", "para rodar rápido,"],
        p2: ["usuarios que andan en moto", "usuarios que van en moto"],
        p3: ["No es solo un adorno,", "No es solo una decoración,"]
    },
    21: {
        p1: ["es bien aerodinámico en negro", "es muy aerodinámico en negro"],
        p2: ["atraen bastante la atención.", "captan bastante la atención."],
        p3: ["te cubre súper bien los", "te cubre sumamente bien los"]
    },
    23: {
        p1: ["te salvas de los insectos", "te proteges de los insectos"],
        p2: ["las piedras del camino.", "las gravillas del camino."],
        p3: ["que te cubre bien los", "que te resguarda bien los"]
    },
    24: {
        p1: ["que acomodas rápido,", "que ajustas rápido,"],
        p2: ["andar limpiando los lentes", "estar limpiando los lentes"],
        p3: ["cuando te esfuerzas mucho.", "cuando te fatigas mucho."]
    },
    25: {
        p1: ["Vienen con detalles en rojo", "Cuentan con detalles en rojo"],
        p2: ["lucen bien con el carenado", "entonan bien con el carenado"],
        p3: ["le dan ese toque clásico", "le dan ese matiz clásico"]
    },
    31: {
        p1: ["súper cómoda para la ciudad.", "sumamente cómoda para la ciudad."],
        p2: ["te las puedes poner para ir", "te las puedes colocar para ir"],
        p3: ["mantienen ese toque de Ducati,", "mantienen ese sello de Ducati,"]
    },
    32: {
        p1: ["tránsito súper rápido y", "tránsito muy rápido y"],
        p2: ["sin hacer esfuerzo.", "sin mayor esfuerzo."],
        p3: ["para acomodar el peso de", "para equilibrar el peso de"]
    },
    34: {
        p1: ["Aligeraron varias partes", "Optimizaron varias partes"],
        p2: ["es notable al usarla.", "es notable al portarla."],
        p3: ["que los típicos modelos gruesos", "que los clásicos modelos gruesos"]
    },
    35: {
        p1: ["y manejar en la ruta se hace", "y conducir en la ruta se hace"],
        p2: ["eliminar reflejos y ver más", "eliminar reflejos y distinguir más"],
        p3: ["los colores resaltan notoriamente", "los matices resaltan notoriamente"]
    },
    36: {
        p1: ["y resiste el uso de todos", "y tolera el uso de todos"],
        p2: ["te sirve para conducir", "te funciona para conducir"],
        p3: ["al elegir qué ponerte.", "al elegir qué vestir."]
    },
    42: {
        p1: ["armazones bien ligeros,", "armazones muy ligeros,"],
        p2: ["soportan un montón el movimiento.", "resisten un montón el movimiento."],
        p3: ["la pusieron directo en", "la integraron directo en"]
    },
    43: {
        p1: ["a toda velocidad,", "a gran velocidad,"],
        p2: ["lo que el público compra,", "lo que el usuario compra,"],
        p3: ["siempre sacan cosas nuevas", "siempre lanzan cosas nuevas"]
    },
    45: {
        p1: ["para sacar unos lentes", "para lanzar unos lentes"],
        p2: ["de buena calidad,", "de alta calidad,"],
        p3: ["como un adelanto de la", "como un anticipo de la"]
    },
    46: {
        p1: ["tapan bastante bien para que", "cubren bastante bien para que"],
        p2: ["recuerdan un poco a las motos", "evocan un poco a las motos"],
        p3: ["de velocidad que atrae.", "de velocidad que fascina."]
    },
    50: {
        p1: ["miras la línea Carrera Ducati,", "observas la línea Carrera Ducati,"],
        p2: ["manejas tranquilo porque", "conduces tranquilo porque"],
        p3: ["Acá te muestro las formas", "Aquí te muestro las formas"]
    },
    52: {
        p1: ["un diseño simple.", "un diseño sobrio."],
        p2: ["miras a los costados sin", "observas a los costados sin"],
        p3: ["eso sirve mucho si vas", "eso ayuda mucho si vas"]
    },
    53: {
        p1: ["bien sólida y muy firme,", "muy sólida y muy firme,"],
        p2: ["están súper marcadas para", "están bien marcadas para"],
        p3: ["con un plástico liviano", "con un polímero liviano"]
    },
    54: {
        p1: ["unas gafas súper prácticas,", "unas gafas muy prácticas,"],
        p2: ["a las caras que son muy", "a los rostros que son muy"],
        p3: ["siempre busca cosas modernas.", "siempre busca diseños modernos."]
    },
    55: {
        p1: ["Te tapa los ojos bien,", "Te cubre los ojos bien,"],
        p2: ["resguarda las mejillas del sol fuerte", "protege las mejillas del sol fuerte"],
        p3: ["Es el típico diseño con", "Es el clásico diseño con"]
    },
    56: {
        p1: ["Te tapan casi toda la cara,", "Te cubren casi toda la cara,"],
        p2: ["la luz del sol no fastidia,", "la luz del sol no molesta,"],
        p3: ["si manejas moto seguido,", "si conduces moto seguido,"]
    },
    58: {
        p1: ["La parte de adelante destaca,", "El frente de adelante destaca,"],
        p2: ["te hace pensar rápido en", "te hace pensar pronto en"],
        p3: ["son ideales para usarlas", "son perfectas para usarlas"]
    },
    61: {
        p1: ["armazón resista bien,", "armazón tolere bien,"],
        p2: ["cuando aceleras son los cristales.", "cuando conduces son los cristales."],
        p3: ["reaccionas a tiempo si", "respondes a tiempo si"]
    },
    62: {
        p1: ["manejar a toda velocidad", "conducir a toda velocidad"],
        p2: ["cuidar los ojos de todo", "proteger los ojos de todo"],
        p3: ["no solo sirven para el", "no solo funcionan para el"]
    },
    63: {
        p1: ["te desconcentras rápido si", "te desconcentras pronto si"],
        p2: ["Carrera World le encontró la", "Carrera World le halló la"],
        p3: ["el lente te resiste el", "el lente te soporta el"]
    },
    64: {
        p1: ["Manejar así te cansa", "Conducir así te cansa"],
        p2: ["no notas del peligro,", "no adviertes del peligro,"],
        p3: ["te cansa mucho la vista", "te fatiga mucho la vista"]
    },
    65: {
        p1: ["se ven súper claras,", "se ven muy claras,"],
        p2: ["tu cabeza los procesa", "tu mente los procesa"],
        p3: ["Vas en el auto y percibes", "Vas en el coche y percibes"]
    },
    66: {
        p1: ["Muchos adquieren monturas en", "Muchos eligen monturas en"],
        p2: ["la luz se mete por los", "la luz penetra por los"],
        p3: ["es un problema peor,", "es un problema mayor,"]
    },
    67: {
        p1: ["vas manejando rápido o", "vas conduciendo rápido o"],
        p2: ["para tapar el sol y que", "para frenar el sol y que"],
        p3: ["absorben la luz eficazmente,", "absorben la radiación eficazmente,"]
    },
    68: {
        p1: ["nada más tapar el sol.", "nada más bloquear el sol."],
        p2: ["hace que rebote el calor", "hace que refleje el calor"],
        p3: ["se ven agresivos y combinan", "lucen agresivos y combinan"]
    },
    69: {
        p1: ["si te agarra la lluvia", "si te alcanza la lluvia"],
        p2: ["los líquidos resbalen,", "los líquidos deslicen,"],
        p3: ["y lo ensucia todo.", "y lo mancha todo."]
    },
    70: {
        p1: ["te salva de la grasa", "te protege de la grasa"],
        p2: ["se raya súper rápido sin", "se raya muy rápido sin"],
        p3: ["andar echando líquidos raros.", "andar aplicando líquidos raros."]
    },
    71: {
        p1: ["mira cuál te conviene", "revisa cuál te conviene"],
        p2: ["usas el auto todos los", "usas el coche todos los"],
        p3: ["con estos avances,", "con estos progresos,"]
    },
    107: {
        p1: ["tiene su maña,", "tiene su técnica,"],
        p2: ["la verdad sirven muchísimo", "en verdad sirven muchísimo"],
        p3: ["incomoda, no pierdes visión si", "incomoda, no pierdes nitidez si"]
    },
    108: {
        p1: ["realmente importa.", "verdaderamente importa."],
        p2: ["la verdad es que un día", "en verdad es que un día"],
        p3: ["si vas manejando a más", "si vas conduciendo a más"]
    },
    109: {
        p1: ["los colores raros o notas", "los colores alterados o notas"],
        p2: ["resisten el agua.", "repelen el agua."],
        p3: ["asfalto rápido, el marco", "asfalto pronto, el marco"]
    },
    114: {
        p1: ["unos lentes fuertes para hacer", "unos lentes robustos para hacer"],
        p2: ["no molesten en la cara,", "no molesten en el rostro,"],
        p3: ["los puedes llevar todos los", "los puedes lucir todos los"]
    },
    116: {
        p1: ["te aguanta el uso de todos", "te soporta el uso de todos"],
        p2: ["aire lo arruina,", "aire lo perjudica,"],
        p3: ["se oxida rapidísimo con el", "se oxida velozmente con el"]
    },
    117: {
        p1: ["lo cargas a todos lados", "lo llevas a todos lados"],
        p2: ["Tolera enormemente los impactos", "Soporta enormemente los impactos"],
        p3: ["los impactos fuertes, no", "los impactos severos, no"]
    },
    118: {
        p1: ["que frena los reflejos que", "que mitiga los reflejos que"],
        p2: ["y soporta bien el uso", "y resiste bien el uso"],
        p3: ["los rayones de todos los", "los rasguños de todos los"]
    },
    119: {
        p1: ["no te va a quemar la piel", "no te va a irritar la piel"],
        p2: ["se agradece inmensamente.", "se valora inmensamente."],
        p3: ["se enfría velozmente,", "se enfría rápidamente,"]
    },
    121: {
        p1: ["te transforma la perspectiva,", "te renueva la perspectiva,"],
        p2: ["para uso intenso,", "para uso riguroso,"],
        p3: ["de que se rompan.", "de que se quiebren."]
    },
    124: {
        p1: ["para dar una vuelta y luce", "para dar un paseo y luce"],
        p2: ["Carrera World sacó propuestas", "Carrera World lanzó propuestas"],
        p3: ["en todos lados últimamente,", "en todas partes últimamente,"]
    },
    125: {
        p1: ["resalta ahora, luce excelente", "destaca ahora, luce excelente"],
        p2: ["con ropa formal", "con atuendo formal"],
        p3: ["queda estupendo con una", "luce estupendo con una"]
    },
    128: {
        p1: ["evaluarlos en serio.", "evaluarlos a fondo."],
        p2: ["a nadie le agrada que", "a nadie le complace que"],
        p3: ["cada fabricante diseña los", "cada fabricante concibe los"]
    },
    159: {
        p1: ["te tapan el viento y", "te frenan el viento y"],
        p2: ["te las pones para caminar", "te las colocas para caminar"],
        p3: ["lucen natural en la", "lucen auténticas en la"]
    },
    162: {
        p1: ["era lo habitual para", "era lo usual para"],
        p2: ["casi nadie inventaba cosas", "casi nadie ideaba cosas"],
        p3: ["algo poco común para", "algo poco habitual para"]
    },
    163: {
        p1: ["al girar la cabeza rápido porque", "al girar la cabeza pronto porque"],
        p2: ["Carrera agarró esta forma", "Carrera adoptó esta forma"],
        p3: ["con un toque más fino para", "con un aire más fino para"]
    },
    166: {
        p1: ["del diseño bonito.", "del diseño vistoso."],
        p2: ["piensan que es un código", "creen que es un código"],
        p3: ["los números ahí son fundamentales.", "los números ahí son esenciales."]
    },
    167: {
        p1: ["rápido te das cuenta de que", "pronto te das cuenta de que"],
        p2: ["encaja bien en tu cara,", "encaja bien en tu rostro,"],
        p3: ["si manejas mucho o buscas", "si conduces mucho o buscas"]
    },
    168: {
        p1: ["no se borre fácil.", "no se borre pronto."],
        p2: ["graban adentro de la patilla", "graban dentro de la patilla"],
        p3: ["tres dimensiones clave para", "tres dimensiones determinantes para"]
    },
    169: {
        p1: ["hasta la orilla de la bisagra,", "hasta el borde de la bisagra,"],
        p2: ["no les tapa la vista", "no les obstruye la vista"],
        p3: ["mides directo desde la parte", "mides directamente desde la parte"]
    },
    170: {
        p1: ["armazón se ajuste bien,", "armazón asiente bien,"],
        p2: ["ponen un cuadrito y justo", "ponen un recuadro y justo"],
        p3: ["que se resbalen o te", "que se deslicen o te"]
    },
    171: {
        p1: ["especifica el largo de la varilla,", "especifica la longitud de la varilla,"],
        p2: ["La gente que anda en", "El público que anda en"],
        p3: ["El último número acá es", "El último valor acá es"]
    },
    172: {
        p1: ["para comprar bien,", "para adquirir bien,"],
        p2: ["un invento al azar.", "un capricho al azar."],
        p3: ["andar incómodo todo el", "estar incómodo todo el"]
    },
    173: {
        p1: ["es simple.", "es sencillo."],
        p2: ["Agarras el código", "Tomas el código"],
        p3: ["te tapan el viento en", "te bloquean el viento en"]
    },
    174: {
        p1: ["medirte la cara,", "medirte el rostro,"],
        p2: ["sumamente fácil de hacer.", "sumamente sencillo de hacer."],
        p3: ["y compras el modelo adecuado", "y adquieres el modelo adecuado"]
    },
    177: {
        p1: ["bien en la cara cuesta bastante,", "bien en el rostro cuesta bastante,"],
        p2: ["Te pasamos unos consejos", "Te compartimos unos consejos"],
        p3: ["mientras manejas:", "mientras conduces:"]
    },
    179: {
        p1: ["al ir rápido en la moto,", "al rodar rápido en la moto,"],
        p2: ["lente frena la tierra", "lente bloquea la tierra"],
        p3: ["un auto se acerca y", "un coche se acerca y"]
    },
    180: {
        p1: ["las acomodas fácil con los", "las ajustas fácil con los"],
        p2: ["permite que las gafas", "garantiza que las gafas"],
        p3: ["desliza las gafas a la", "desplaza las gafas a la"]
    },
    181: {
        p1: ["sirve para algo concreto.", "funciona para algo concreto."],
        p2: ["relleno interior.", "acolchado interior."],
        p3: ["entran directamente,", "encajan directamente,"]
    },
    183: {
        p1: ["ojos menos cansados y el cuello", "ojos menos fatigados y el cuello"],
        p2: ["después de manejar tiempo.", "después de conducir tiempo."],
        p3: ["esto te sirve para medir", "esto te ayuda para medir"]
    }
};

let errors = 0;
for (const [lineNumStr, config] of Object.entries(edits)) {
    const lineNum = parseInt(lineNumStr);
    const origLine = lines[lineNum - 1];
    const origWords = getWords(origLine);

    // Pass 1 test
    if (!origLine.includes(config.p1[0])) {
        console.error(`Line ${lineNum} P1 target missing: "${config.p1[0]}"`);
        errors++;
        continue;
    }
    const line1 = origLine.replace(config.p1[0], config.p1[1]);
    if (extractTags(origLine) !== extractTags(line1)) {
        console.error(`Line ${lineNum} P1 tag mismatch!`);
        errors++;
    }
    const dist1 = wordLevenshtein(origWords, getWords(line1));
    const ratio1 = dist1 / origWords.length;
    if (ratio1 >= 0.05) {
        console.error(`Line ${lineNum} P1 ratio ${(ratio1 * 100).toFixed(2)}% >= 5% (words=${origWords.length}, dist=${dist1})`);
        errors++;
    }

    // Pass 2 test (on top of Pass 1)
    if (!line1.includes(config.p2[0])) {
        console.error(`Line ${lineNum} P2 target missing: "${config.p2[0]}"`);
        errors++;
        continue;
    }
    const line2 = line1.replace(config.p2[0], config.p2[1]);
    if (extractTags(line1) !== extractTags(line2)) {
        console.error(`Line ${lineNum} P2 tag mismatch!`);
        errors++;
    }
    const dist2 = wordLevenshtein(getWords(line1), getWords(line2));
    const ratio2 = dist2 / getWords(line1).length;
    if (ratio2 >= 0.05) {
        console.error(`Line ${lineNum} P2 ratio ${(ratio2 * 100).toFixed(2)}% >= 5% (words=${getWords(line1).length}, dist=${dist2})`);
        errors++;
    }

    // Pass 3 test (on top of Pass 2)
    if (!line2.includes(config.p3[0])) {
        console.error(`Line ${lineNum} P3 target missing: "${config.p3[0]}"`);
        errors++;
        continue;
    }
    const line3 = line2.replace(config.p3[0], config.p3[1]);
    if (extractTags(line2) !== extractTags(line3)) {
        console.error(`Line ${lineNum} P3 tag mismatch!`);
        errors++;
    }
    const dist3 = wordLevenshtein(getWords(line2), getWords(line3));
    const ratio3 = dist3 / getWords(line2).length;
    if (ratio3 >= 0.05) {
        console.error(`Line ${lineNum} P3 ratio ${(ratio3 * 100).toFixed(2)}% >= 5% (words=${getWords(line2).length}, dist=${dist3})`);
        errors++;
    }
}

if (errors === 0) {
    console.log(`SUCCESS: All ${Object.keys(edits).length} lines passed P1, P2, and P3 validations!`);
} else {
    console.log(`FAILED with ${errors} errors.`);
}

module.exports = { edits };
