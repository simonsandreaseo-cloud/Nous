const fs = require('fs');
const path = require('path');

const dir = __dirname;
const baseFile = path.join(dir, 'latest_base.html');
const pass1File = path.join(dir, 'surg_pass_1.html');
const pass2File = path.join(dir, 'surg_pass_2.html');
const pass3File = path.join(dir, 'surg_pass_3.html');

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

function verifyChunk(passName, origLine, newLine, lineNum) {
    const origText = origLine.replace(/<[^>]+>/g, '').trim();
    const newText = newLine.replace(/<[^>]+>/g, '').trim();

    if (!origText || origLine.includes('[*')) return null;

    const origWords = origText.split(/\s+/).filter(Boolean);
    const newWords = newText.split(/\s+/).filter(Boolean);

    const dist = wordLevenshtein(origWords, newWords);
    const ratio = dist / origWords.length;
    const percent = (ratio * 100).toFixed(2);

    if (ratio >= 0.05) {
        throw new Error(`VIOLATION in ${passName} at line ${lineNum}: edit ratio ${percent}% exceeds 5% limit! (dist=${dist}, words=${origWords.length})\nOrig: ${origText}\nNew: ${newText}`);
    }

    return { lineNum, words: origWords.length, dist, percent };
}

// PASS 1 substitutions (applied on latest_base.html)
const pass1Replacements = [
    // L2 (61 words): "sacas ventaja" -> "obtienes ventaja" (1 word changed, 1/61 = 1.64%)
    ["sacas ventaja cuando juegas", "obtienes ventaja cuando juegas"],

    // L5 (94 words): "que de verdad funcionan" -> "que realmente funcionan" (2 words changed, 2/94 = 2.13%)
    ["que de verdad funcionan para proteger", "que realmente funcionan para proteger"],

    // L8 (81 words): "aguanta caídas" -> "resiste caídas" (1 word changed, 1/81 = 1.23%)
    ["aguanta caídas y no pesa", "resiste caídas y no pesa"],

    // L9 (92 words): "evitan que se resbalen" -> "evitan que se deslicen" (1 word changed, 1/92 = 1.09%)
    ["evitan que se resbalen cuando", "evitan que se deslicen cuando"],

    // L13 (70 words): "para deporte y calle" -> "para deporte y ciudad" (1 word changed, 1/70 = 1.43%)
    ["Es un modelo para deporte y calle inspirado", "Es un modelo para deporte y ciudad inspirado"],

    // L14 (53 words): "se queden fijas" -> "permanezcan fijas" (1 word changed, 1/53 = 1.89%)
    ["garantiza que las gafas se queden fijas sin", "garantiza que las gafas permanezcan fijas sin"],

    // L18 (59 words): "se agarran bien" -> "se sujetan bien" (1 word changed, 1/59 = 1.69%)
    ["que se agarran bien a la cabeza", "que se sujetan bien a la cabeza"],

    // L19 (47 words): "entran fácil debajo" -> "encajan fácilmente debajo" (2 words changed, 2/47 = 4.26%)
    ["entran fácil debajo de cualquier", "encajan fácilmente debajo de cualquier"],

    // L21 (39 words): "no aprietan a los lados" -> "no presionan a los lados" (1 word changed, 1/39 = 2.56%)
    ["no aprietan a los lados cuando", "no presionan a los lados cuando"],

    // L22 (31 words): "Su armazón circular soporta" -> "Su armazón circular admite" (1 word changed, 1/31 = 3.23%)
    ["Su armazón circular soporta tanto", "Su armazón circular admite tanto"],

    // L23 (38 words): "deja pasar algo más" -> "permite pasar algo más" (1 word changed, 1/38 = 2.63%)
    ["deja pasar algo más de luz", "permite pasar algo más de luz"],

    // L28 (100 words): "el rendimiento disminuye." -> "el rendimiento decae.", "la orilla de la tormenta," -> "el límite de la tormenta," (2 words changed, 2/100 = 2.00%)
    ["el rendimiento disminuye.", "el rendimiento decae."],
    ["la orilla de la tormenta,", "el límite de la tormenta,"],

    // L29 (83 words): "piensas que es puro lujo pero" -> "consideras que es puro lujo pero", "reduce el cansancio visual:" -> "mitiga el cansancio visual:" (2 words changed, 2/83 = 2.41%)
    ["piensas que es puro lujo pero", "consideras que es puro lujo pero"],
    ["reduce el cansancio visual:", "mitiga el cansancio visual:"],

    // L32 (32 words): "resalta bien los colores," -> "realza bien los colores," (1 word changed, 1/32 = 3.12%)
    ["resalta bien los colores,", "realza bien los colores,"],

    // L33 (34 words): "colaboración incorporan detalles" -> "colaboración integran detalles" (1 word changed, 1/34 = 2.94%)
    ["colaboración incorporan detalles exclusivos", "colaboración integran detalles exclusivos"],

    // L34 (30 words): "reaccionar más velozmente" -> "reaccionar más rápidamente" (1 word changed, 1/30 = 3.33%)
    ["reaccionar más velozmente en las partidas,", "reaccionar más rápidamente en las partidas,"],

    // L35 (27 words): "Son muy livianas" -> "Son muy ligeras" (1 word changed, 1/27 = 3.70%)
    ["Son muy livianas y flexibles,", "Son muy ligeras y flexibles,"],

    // L41 (82 words): "desde hace rato notan" -> "desde hace tiempo notan" (1 word changed, 1/82 = 1.22%)
    ["desde hace rato notan que estas", "desde hace tiempo notan que estas"],

    // L42 (59 words): "Todo esto avanza rápido" -> "Todo esto evoluciona rápidamente" (2 words changed, 2/59 = 3.39%)
    ["Todo esto avanza rápido y los lentes", "Todo esto evoluciona rápidamente y los lentes"],

    // L73 (44 words): "aguantan golpes y sirven" -> "resisten impactos y sirven" (2 words changed, 2/44 = 4.55%)
    ["aguantan golpes y sirven mucho", "resisten impactos y sirven mucho"],

    // L76 (55 words): "ayudaron bastante." -> "influyeron notablemente." (2 words changed, 2/55 = 3.64%)
    ["ayudaron bastante.", "influyeron notablemente."],

    // L77 (26 words): "cantantes latinos conocidos," -> "cantantes latinos destacados," (1 word changed, 1/26 = 3.85%)
    ["cantantes latinos conocidos,", "cantantes latinos destacados,"],

    // L79 (85 words): "simple herramienta médica" -> "mera herramienta médica" (1 word changed, 1/85 = 1.18%)
    ["una simple herramienta médica a un", "una mera herramienta médica a un"],

    // L81 (78 words): "quieren verse bien" -> "buscan verse bien", "para esquivar ese brillo:" -> "para mitigar ese brillo:" (2 words changed, 2/78 = 2.56%)
    ["streamers quieren verse bien en sus", "streamers buscan verse bien en sus"],
    ["para esquivar ese brillo:", "para mitigar ese brillo:"],

    // L84 (62 words): "anda buscando ediciones" -> "busca ediciones" (1 word changed, 1/62 = 1.61%)
    ["mundo anda buscando ediciones especiales", "mundo busca ediciones especiales"],

    // L85 (97 words): "lentes piratas provoca" -> "lentes falsificados genera" (2 words changed, 2/97 = 2.06%)
    ["lentes piratas provoca fatiga", "lentes falsificados genera fatiga"],

    // L86 (47 words): "toca fijarse bien" -> "conviene fijarse bien" (1 word changed, 1/47 = 2.13%)
    ["bastante y toca fijarse bien antes", "bastante y conviene fijarse bien antes"],

    // L89 (38 words): "copia bien hecha" -> "réplica bien hecha" (1 word changed, 1/38 = 2.63%)
    ["o una copia bien hecha si no", "o una réplica bien hecha si no"],

    // L91 (53 words): "traen un grabado láser" -> "incorporan un grabado láser" (1 word changed, 1/53 = 1.89%)
    ["originales: traen un grabado láser limpio", "originales: incorporan un grabado láser limpio"],

    // L92 (52 words): "aguantan bastantes golpes" -> "resisten bastantes golpes" (1 word changed, 1/52 = 1.92%)
    ["que aguantan bastantes golpes y se sienten", "que resisten bastantes golpes y se sienten"],

    // L93 (30 words): "vienen firmes," -> "resultan firmes," (1 word changed, 1/30 = 3.33%)
    ["las originales vienen firmes, abren", "las originales resultan firmes, abren"],

    // L94 (45 words): "se agarra mejor" -> "se adhiere mejor" (1 word changed, 1/45 = 2.22%)
    ["que se agarra mejor si sudas.", "que se adhiere mejor si sudas."],

    // L95 (65 words): "Mira la patilla izquierda" -> "Inspecciona la patilla izquierda" (1 word changed, 1/65 = 1.54%)
    ["Mira la patilla izquierda para buscar", "Inspecciona la patilla izquierda para buscar"],

    // L97 (36 words): "revisar esto sin prisas" -> "verificar esto sin prisas" (1 word changed, 1/36 = 2.78%)
    ["la pena revisar esto sin prisas", "la pena verificar esto sin prisas"]
];

// PASS 2 substitutions (applied on top of Pass 1)
const pass2Replacements = [
    // L2 (61 words): "para ver mejor" -> "para distinguir mejor" (1 word changed, 1/61 = 1.64%)
    ["Prizm para ver mejor los colores", "Prizm para distinguir mejor los colores"],

    // L5 (94 words): "me puse a revisar" -> "me dediqué a revisar" (1 word changed, 1/94 = 1.06%)
    ["por eso me puse a revisar los modelos", "por eso me dediqué a revisar los modelos"],

    // L8 (81 words): "te dejan mirar" -> "permiten observar" (2 words changed, 2/81 = 2.47%)
    ["juego y te dejan mirar las esquinas", "juego y permiten observar las esquinas"],

    // L9 (92 words): "Traen plaquetas nasales" -> "Cuentan con plaquetas nasales" (2 words changed, 2/92 = 2.17%)
    ["amarillo exagerado. Traen plaquetas nasales", "amarillo exagerado. Cuentan con plaquetas nasales"],

    // L13 (70 words): "se vende velozmente" -> "se comercializa rápidamente" (2 words changed, 2/70 = 2.86%)
    ["en el surf que se vende velozmente dentro", "en el surf que se comercializa rápidamente dentro"],

    // L14 (52 words): "cobertura panorámica total," -> "cobertura panorámica completa," (1 word changed, 1/52 = 1.92%)
    ["cobertura panorámica total,", "cobertura panorámica completa,"],

    // L18 (59 words): "la moda de calle" -> "la moda urbana" (2 words changed, 2/59 = 3.39%)
    ["mezclan la moda de calle con elementos", "mezclan la moda urbana con elementos"],

    // L19 (47 words): "Aquí te resumo" -> "Aquí sintetizo" (1 word changed, 1/47 = 2.13%)
    ["de diadema. Aquí te resumo lo mejor", "de diadema. Aquí sintetizo lo mejor"],

    // L21 (39 words): "llevas auriculares encima" -> "usas auriculares encima" (1 word changed, 1/39 = 2.56%)
    ["lados cuando llevas auriculares encima durante", "lados cuando usas auriculares encima durante"],

    // L22 (31 words): "quienes necesitan corrección" -> "quienes requieren corrección" (1 word changed, 1/31 = 3.23%)
    ["azul para quienes necesitan corrección óptica", "azul para quienes requieren corrección óptica"],

    // L23 (38 words): "silueta redonda de corte urbano" -> "silueta redonda de estilo urbano" (1 word changed, 1/38 = 2.63%)
    ["silueta redonda de corte urbano y no", "silueta redonda de estilo urbano y no"],

    // L28 (100 words): "construir velozmente;" -> "construir con rapidez;" (2 words changed, 2/100 = 2.00%)
    ["reflejos y construir velozmente; si no", "reflejos y construir con rapidez; si no"],

    // L29 (83 words): "reaccionas velozmente" -> "reaccionas de inmediato" (2 words changed, 2/83 = 2.41%)
    ["más cómodo, reaccionas velozmente si recibes", "más cómodo, reaccionas de inmediato si recibes"],

    // L32 (32 words): "tan velozmente y sirve" -> "tan rápidamente y sirve" (1 word changed, 1/32 = 3.12%)
    ["los ojos tan velozmente y sirve mucho", "los ojos tan rápidamente y sirve mucho"],

    // L33 (34 words): "detalles exclusivos como" -> "elementos exclusivos como" (1 word changed, 1/34 = 2.94%)
    ["integran detalles exclusivos como", "integran elementos exclusivos como"],

    // L34 (30 words): "notas detalles que antes" -> "aprecias detalles que antes" (1 word changed, 1/30 = 3.33%)
    ["las partidas, notas detalles que antes", "las partidas, aprecias detalles que antes"],

    // L35 (27 words): "apretar la cabeza" -> "presionar la cabeza" (1 word changed, 1/27 = 3.70%)
    ["no te van a apretar la cabeza", "no te van a presionar la cabeza"],

    // L41 (82 words): "pero traen todo metido adentro." -> "pero traen todo integrado adentro." (1 word changed, 1/82 = 1.22%)
    ["pero traen todo metido adentro.", "pero traen todo integrado adentro."],

    // L42 (59 words): "al tenerlos puestos." -> "al llevarlos puestos." (1 word changed, 1/59 = 1.69%)
    ["apenas se note al tenerlos puestos.", "apenas se note al llevarlos puestos."],

    // L73 (44 words): "traen parlantes," -> "incorporan altavoces," (2 words changed, 2/44 = 4.55%)
    ["muy compactas, traen parlantes, resisten", "muy compactas, incorporan altavoces, resisten"],

    // L76 (55 words): "prendes un directo" -> "inicias un directo" (1 word changed, 1/55 = 1.82%)
    ["la calle o prendes un directo en Twitch", "la calle o inicias un directo en Twitch"],

    // L77 (26 words): "diseños de archivo" -> "siluetas de archivo" (1 word changed, 1/26 = 3.85%)
    ["ha recuperado diseños de archivo junto", "ha recuperado siluetas de archivo junto"],

    // L79 (85 words): "modifican superficialmente" -> "alteran superficialmente" (1 word changed, 1/85 = 1.18%)
    ["perfil no solo modifican superficialmente el color", "perfil no solo alteran superficialmente el color"],

    // L81 (78 words): "un montón de gente mirándolos" -> "un montón de gente observándolos" (1 word changed, 1/78 = 1.28%)
    ["tienen a un montón de gente mirándolos y las", "tienen a un montón de gente observándolos y las"],

    // L84 (62 words): "copias falsas si te descuidas." -> "falsificaciones si te descuidas." (1 word changed, 1/62 = 1.61%)
    ["abundan las copias falsas si te descuidas.", "abundan las falsificaciones si te descuidas."],

    // L85 (97 words): "representa una pérdida" -> "supone una pérdida" (1 word changed, 1/97 = 1.03%)
    ["gaming no solo representa una pérdida económica", "gaming no solo supone una pérdida económica"],

    // L86 (47 words): "Mejor compra siempre" -> "Mejor adquiere siempre" (1 word changed, 1/47 = 2.13%)
    ["cada detalle. Mejor compra siempre en ópticas", "cada detalle. Mejor adquiere siempre en ópticas"],

    // L89 (38 words): "para revisar antes" -> "para verificar antes" (1 word changed, 1/38 = 2.63%)
    ["guía rápida para revisar antes de pagar", "guía rápida para verificar antes de pagar"],

    // L91 (53 words): "pintura blanca barata" -> "pintura blanca deficiente" (1 word changed, 1/53 = 1.89%)
    ["imitaciones usan pintura blanca barata que se", "imitaciones usan pintura blanca deficiente que se"],

    // L92 (52 words): "no traen bordes rasposos" -> "no presentan bordes ásperos" (2 words changed, 2/52 = 3.85%)
    ["partirse y no traen bordes rasposos ni rebabas", "partirse y no presentan bordes ásperos ni rebabas"],

    // L93 (30 words): "sonar a plástico barato" -> "sonar a plástico simple" (1 word changed, 1/30 = 3.33%)
    ["suavidad sin sonar a plástico barato y todo", "suavidad sin sonar a plástico simple y todo"],

    // L94 (45 words): "silicona dura que resbala" -> "silicona rígida que resbala" (1 word changed, 1/45 = 2.22%)
    ["silicona dura que resbala con nada y se", "silicona rígida que resbala con nada y se"],

    // L95 (65 words): "luego trae cuatro números," -> "luego incluye cuatro números," (1 word changed, 1/65 = 1.54%)
    ["luego trae cuatro números, un guion", "luego incluye cuatro números, un guion"],

    // L97 (36 words): "cuidas tus ojos de" -> "proteges tus ojos de" (1 word changed, 1/36 = 2.78%)
    ["mucho más y cuidas tus ojos de una", "mucho más y proteges tus ojos de una"]
];

// PASS 3 substitutions (applied on top of Pass 2)
const pass3Replacements = [
    // L2 (61 words): "te los puedes poner con" -> "puedes utilizarlos con" (2 words changed, 2/61 = 3.28%)
    ["confortables y te los puedes poner con los auriculares", "confortables y puedes utilizarlos con los auriculares"],

    // L5 (94 words): "destacar con el estilo" -> "sobresalir con el estilo" (1 word changed, 1/94 = 1.06%)
    ["tus ojos y destacar con el estilo del juego.", "tus ojos y sobresalir con el estilo del juego."],

    // L8 (81 words): "combinan justo con" -> "armonizan con" (2 words changed, 2/81 = 2.47%)
    ["agresivas que combinan justo con la estética", "agresivas que armonizan con la estética"],

    // L9 (92 words): "se pone intensa" -> "se torna intensa" (1 word changed, 1/92 = 1.09%)
    ["cuando la partida se pone intensa y el círculo", "cuando la partida se torna intensa y el círculo"],

    // L13 (70 words): "llamativa lente dorada" -> "singular lente dorada" (1 word changed, 1/70 = 1.43%)
    ["transición azul cian con una llamativa lente dorada", "transición azul cian con una singular lente dorada"],

    // L14 (53 words): "a la calle con una" -> "a la ciudad con una" (1 word changed, 1/53 = 1.89%)
    ["del Battle Royale a la calle con una cobertura", "del Battle Royale a la ciudad con una cobertura"],

    // L18 (59 words): "streamers conocidos los usan" -> "streamers reconocidos los utilizan" (2 words changed, 2/59 = 3.39%)
    ["varios streamers conocidos los usan frecuentemente.", "varios streamers reconocidos los utilizan frecuentemente."],

    // L19 (47 words): "suele ser incómodo," -> "suele resultar incómodo," (1 word changed, 1/47 = 2.13%)
    ["lentes gruesos suele ser incómodo, pero las", "lentes gruesos suele resultar incómodo, pero las"],

    // L21 (39 words): "son delgadas y planas," -> "son finas y planas," (1 word changed, 1/39 = 2.56%)
    ["varillas metálicas son delgadas y planas, por lo", "varillas metálicas son finas y planas, por lo"],

    // L22 (31 words): "Su armazón circular admite" -> "Su estructura circular admite" (1 word changed, 1/31 = 3.23%)
    ["Su armazón circular admite", "Su estructura circular admite"],

    // L23 (38 words): "si juegas en habitaciones" -> "si compites en habitaciones" (1 word changed, 1/38 = 2.63%)
    ["Helux o Hydra si juegas en habitaciones con", "Helux o Hydra si compites en habitaciones con"],

    // L28 (100 words): "ayuda bastante para cuidar" -> "contribuye con eficacia a cuidar" (3 words changed, 3/100 = 3.00%)
    ["para Fortnite ayuda bastante para cuidar los ojos", "para Fortnite contribuye con eficacia a cuidar los ojos"],

    // L29 (83 words): "El marco no pesa nada," -> "La montura no pesa nada," (1 word changed, 1/83 = 1.20%)
    ["en Fortnite se ven más claros. El marco no pesa nada,", "en Fortnite se ven más claros. La montura no pesa nada,"],

    // L32 (32 words): "si te clavas varias" -> "si te pasas varias" (1 word changed, 1/32 = 3.12%)
    ["sirve mucho si te clavas varias horas seguidas", "sirve mucho si te pasas varias horas seguidas"],

    // L33 (34 words): "universo de Epic Games." -> "ecosistema de Epic Games." (1 word changed, 1/34 = 2.94%)
    ["inspiradas en el universo de Epic Games.", "inspiradas en el ecosistema de Epic Games."],

    // L34 (30 words): "rivales escondidos al instante." -> "rivales ocultos al instante." (1 word changed, 1/30 = 3.33%)
    ["encuentras a los rivales escondidos al instante.", "encuentras a los rivales ocultos al instante."],

    // L35 (27 words): "auriculares puestos sin molestias." -> "auriculares puestos sin fatiga." (1 word changed, 1/27 = 3.70%)
    ["auriculares puestos sin molestias.", "auriculares puestos sin fatiga."],

    // L41 (82 words): "Quienes siguen el tema" -> "Quienes siguen el sector" (1 word changed, 1/82 = 1.22%)
    ["adentro. Quienes siguen el tema de los lentes", "adentro. Quienes siguen el sector de los lentes"],

    // L42 (59 words): "se aprecia cómo funciona" -> "se observa cómo funciona" (1 word changed, 1/59 = 1.69%)
    ["donde se aprecia cómo funciona el sistema", "donde se observa cómo funciona el sistema"],

    // L73 (44 words): "te ves bien y" -> "luces bien y" (1 word changed, 1/44 = 2.27%)
    ["enfoca mejor, te ves bien y ni se", "enfoca mejor, luces bien y ni se"],

    // L76 (55 words): "la moda urbana cambió todo" -> "la moda urbana lo transformó" (2 words changed, 2/55 = 3.64%)
    ["entrenar; la moda urbana cambió todo y los artistas", "entrenar; la moda urbana lo transformó y los artistas"],

    // L77 (26 words): "colores llamativos y" -> "colores vibrantes y" (1 word changed, 1/26 = 3.85%)
    ["aplicando colores llamativos y lentes espejados", "aplicando colores vibrantes y lentes espejados"],

    // L79 (85 words): "diseño ergonómico de gafas" -> "desarrollo ergonómico de gafas" (1 word changed, 1/85 = 1.18%)
    ["urbana y el diseño ergonómico de gafas de precisión", "urbana y el desarrollo ergonómico de gafas de precisión"],

    // L81 (78 words): "les molestan mucho en los ojos." -> "les fatigan en los ojos." (1 word changed, 1/78 = 1.28%)
    ["del estudio les molestan mucho en los ojos. Muchos eligen", "del estudio les fatigan en los ojos. Muchos eligen"],

    // L84 (62 words): "gastar tu dinero en unos" -> "invertir tu dinero en unos" (1 word changed, 1/62 = 1.61%)
    ["Si vas a gastar tu dinero en unos lentes", "Si vas a invertir tu dinero en unos lentes"],

    // L85 (97 words): "constituye un riesgo grave" -> "entraña un riesgo grave" (1 word changed, 1/97 = 1.03%)
    ["comprador, sino que constituye un riesgo grave e", "comprador, sino que entraña un riesgo grave e"],

    // L86 (47 words): "antes de realizar la inversión" -> "antes de efectuar la inversión" (1 word changed, 1/47 = 2.13%)
    ["antes de realizar la inversión. Puedes revisar", "antes de efectuar la inversión. Puedes revisar"],

    // L89 (38 words): "tan fácil:" -> "tan fácilmente:" (1 word changed, 1/38 = 2.63%)
    ["que no te engañen tan fácil:", "que no te engañen tan fácilmente:"],

    // L91 (53 words): "Fíjate en los modelos" -> "Examina los modelos" (1 word changed, 1/53 = 1.89%)
    ["Lentes:</strong> Fíjate en los modelos Prizm,", "Lentes:</strong> Examina los modelos Prizm,"],

    // L92 (52 words): "Las monturas originales usan" -> "Las monturas originales emplean" (1 word changed, 1/52 = 1.92%)
    ["Matter:</strong> Las monturas originales usan O-Matter", "Matter:</strong> Las monturas originales emplean O-Matter"],

    // L93 (30 words): "todo calza justo" -> "todo encaja justo" (1 word changed, 1/30 = 3.33%)
    ["plástico simple y todo calza justo sin holguras.", "plástico simple y todo encaja justo sin holguras."],

    // L94 (45 words): "se deteriora rápido." -> "se deteriora velozmente." (1 word changed, 1/45 = 2.22%)
    ["con nada y se deteriora rápido.</li>", "con nada y se deteriora velozmente.</li>"],

    // L95 (65 words): "costuras bien terminadas." -> "costuras impecables." (1 word changed, 1/65 = 1.54%)
    ["microfibra con costuras bien terminadas.</li>", "microfibra con costuras impecables.</li>"],

    // L97 (36 words): "conviene ahorrarse problemas." -> "conviene evitar problemas." (1 word changed, 1/36 = 2.78%)
    ["delicada y conviene ahorrarse problemas.</p>", "delicada y conviene evitar problemas.</p>"]
];

function applyAndVerifyPass(inputContent, replacements, passName) {
    let outputContent = inputContent;
    for (const [target, replacement] of replacements) {
        if (!outputContent.includes(target)) {
            throw new Error(`Target string not found in ${passName}: "${target}"`);
        }
        outputContent = outputContent.replace(target, replacement);
    }

    const inLines = inputContent.split('\n');
    const outLines = outputContent.split('\n');

    if (inLines.length !== outLines.length) {
        throw new Error(`Line count mismatch in ${passName}: before=${inLines.length}, after=${outLines.length}`);
    }

    let checkedCount = 0;
    let maxRatio = 0;
    for (let i = 0; i < inLines.length; i++) {
        const res = verifyChunk(passName, inLines[i], outLines[i], i + 1);
        if (res) {
            checkedCount++;
            const pct = parseFloat(res.percent);
            if (pct > maxRatio) maxRatio = pct;
        }
    }

    console.log(`[${passName}] Successfully verified ${checkedCount} chunks. Maximum single-chunk edit: ${maxRatio}% (< 5.0% STRICT limit met!)`);
    return outputContent;
}

// Execute
const baseContent = fs.readFileSync(baseFile, 'utf8');

console.log('--- Applying Pass 1 ---');
const pass1Content = applyAndVerifyPass(baseContent, pass1Replacements, 'Pass 1');
fs.writeFileSync(pass1File, pass1Content, 'utf8');
console.log(`Saved: ${pass1File}`);

console.log('--- Applying Pass 2 (on top of Pass 1) ---');
const readPass1 = fs.readFileSync(pass1File, 'utf8');
const pass2Content = applyAndVerifyPass(readPass1, pass2Replacements, 'Pass 2');
fs.writeFileSync(pass2File, pass2Content, 'utf8');
console.log(`Saved: ${pass2File}`);

console.log('--- Applying Pass 3 (on top of Pass 2) ---');
const readPass2 = fs.readFileSync(pass2File, 'utf8');
const pass3Content = applyAndVerifyPass(readPass2, pass3Replacements, 'Pass 3');
fs.writeFileSync(pass3File, pass3Content, 'utf8');
console.log(`Saved: ${pass3File}`);

// Tag integrity check
function extractTags(str) {
    return (str.match(/<[^>]+>/g) || []).join('');
}

const baseTags = extractTags(baseContent);
const p1Tags = extractTags(pass1Content);
const p2Tags = extractTags(pass2Content);
const p3Tags = extractTags(pass3Content);

if (baseTags !== p1Tags || baseTags !== p2Tags || baseTags !== p3Tags) {
    throw new Error('FATAL: HTML tags were altered during processing!');
}
console.log('Tag verification: 100% MATCH across all passes (0 tag regressions).');

console.log('All 3 passes completed and verified.');
