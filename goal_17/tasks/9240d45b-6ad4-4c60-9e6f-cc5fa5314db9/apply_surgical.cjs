const fs = require('fs');
const path = require('path');

const taskDir = __dirname;
const baseFile = path.join(taskDir, 'latest_base.html');
const contentBase = fs.readFileSync(baseFile, 'utf8');

// Pass 1 replacements per chunk
const pass1_replacements = [
    {
        name: "Line 2 (p)",
        from: "quedan bien con ropa grande, el confort es clave.",
        to: "quedan bien con prendas oversize, el confort es clave."
    },
    {
        name: "Line 4 (p)",
        from: "Usaron materiales muy finos para este modelo",
        to: "Usaron materiales nobles para este modelo"
    },
    {
        name: "Line 6 (li 1)",
        from: "aguantan golpes en el suelo, traen filtro UV400",
        to: "resisten impactos accidentales, traen filtro UV400"
    },
    {
        name: "Line 7 (li 2)",
        from: "Son suaves al tocar, los clientes quieren",
        to: "Son suaves al tacto, los clientes quieren"
    },
    {
        name: "Line 8 (li 3)",
        from: "El agua resbala por el vidrio, olvidas limpiar",
        to: "El agua resbala por el cristal, olvidas limpiar"
    },
    {
        name: "Line 10 (p)",
        from: "Junté las tres máscaras de Gucci",
        to: "Reuní las tres máscaras de Gucci"
    },
    {
        name: "Line 48 (p)",
        from: "Agarraron las gafas gigantes de esquiar",
        to: "Rescataron las gafas gigantes de esquiar"
    },
    {
        name: "Line 48 (p) pt 2",
        from: "las fotos quedan bien.",
        to: "las fotos lucen impecables."
    },
    {
        name: "Line 49 (p)",
        from: "el material no pesa nada.",
        to: "el material resulta ultraligero."
    },
    {
        name: "Line 50 (p)",
        from: "Traen vidrios gigantes de deporte",
        to: "Traen lentes panorámicas de deporte"
    },
    {
        name: "Line 52 (p)",
        from: "unas casas venden cosas simples y chicas",
        to: "unas casas venden diseños sobrios y compactos"
    },
    {
        name: "Line 53 (p)",
        from: "Comparas las cosas de Gucci, miras",
        to: "Comparas las creaciones de Gucci, miras"
    },
    {
        name: "Line 54 (p)",
        from: "tienen un toque rebelde y de mujer.",
        to: "tienen un toque rebelde y femenino."
    },
    {
        name: "Line 56 (p)",
        from: "Comprar cosas caras trae riesgos",
        to: "Comprar artículos exclusivos trae riesgos"
    },
    {
        name: "Line 57 (p)",
        from: "revisa las letras de adentro, se tienen",
        to: "revisa las inscripciones internas, se tienen"
    },
    {
        name: "Line 58 (p)",
        from: "Nadie quiere perder su plata, ir a lo seguro",
        to: "Nadie quiere perder su inversión, ir a lo seguro"
    },
    {
        name: "Line 59 (p)",
        from: "duran un montón de años.",
        to: "duran muchos años."
    },
    {
        name: "Line 61 (p)",
        from: "es imposible pasar escondido, el verano",
        to: "es imposible pasar desapercibido, el verano"
    },
    {
        name: "Line 63 (p)",
        from: "quedan muy bien con ropa técnica cara.",
        to: "quedan muy bien con prendas técnicas premium."
    },
    {
        name: "Line 65 (p)",
        from: "agarras unas gafas gigantes tipo máscara",
        to: "incorporas unas gafas gigantes tipo máscara"
    },
    {
        name: "Line 67 (p)",
        from: "una camisa de seda con dibujos grandes ayuda bastante.",
        to: "una camisa de seda con estampados llamativos ayuda bastante."
    },
    {
        name: "Line 69 (p)",
        from: "tapan media cara, funcionan como",
        to: "cubren medio rostro, funcionan como"
    },
    {
        name: "Line 70 (p)",
        from: "parecen escudos. al usar unas Gucci oversize",
        to: "parecen escudos. Al llevar unas Gucci oversize"
    }
];

let pass1_content = contentBase;
for (const rep of pass1_replacements) {
    if (!pass1_content.includes(rep.from)) {
        console.error(`ERROR: Target not found for Pass 1: "${rep.from}"`);
        process.exit(1);
    }
    pass1_content = pass1_content.replace(rep.from, rep.to);
}

fs.writeFileSync(path.join(taskDir, 'surg_pass_1.html'), pass1_content, 'utf8');
console.log('surg_pass_1.html written successfully.');

// Pass 2 replacements per chunk (applied cumulatively on surg_pass_1.html)
const pass2_replacements = [
    {
        name: "Line 2 (p)",
        from: "traen la moda de los años ochenta",
        to: "evocan la moda de los años ochenta"
    },
    {
        name: "Line 4 (p)",
        from: "eso ayuda a la comodidad, el público",
        to: "favoreciendo la comodidad, el público"
    },
    {
        name: "Line 6 (li 1)",
        from: "traen filtro UV400, bloquean",
        to: "incorporan filtro UV400, bloquean"
    },
    {
        name: "Line 7 (li 2)",
        from: "el sudor no hace daño, te echas",
        to: "el sudor no las altera, te echas"
    },
    {
        name: "Line 8 (li 3)",
        from: "las huellas no se pegan. El agua",
        to: "las huellas no se adhieren. El agua"
    },
    {
        name: "Line 10 (p)",
        from: "la marca sacará colecciones exclusivas",
        to: "la marca lanzará colecciones exclusivas"
    },
    {
        name: "Line 48 (p)",
        from: "pegarán fuerte esta temporada, serán un éxito",
        to: "marcarán tendencia esta temporada, serán un éxito"
    },
    {
        name: "Line 49 (p)",
        from: "la gafa tapa casi toda la cara",
        to: "la gafa cubre casi toda la cara"
    },
    {
        name: "Line 50 (p)",
        from: "usas estas gafas en cualquier lado.",
        to: "usas estas gafas en cualquier ocasión."
    },
    {
        name: "Line 52 (p)",
        from: "tapan la cara, revitalizan la estética",
        to: "cubren el rostro, revitalizan la estética"
    },
    {
        name: "Line 53 (p)",
        from: "notas rápido que son ofertas distintas.",
        to: "adviertes enseguida que son ofertas distintas."
    },
    {
        name: "Line 54 (p)",
        from: "Gucci hace piezas raras, fabrican",
        to: "Gucci hace piezas singulares, fabrican"
    },
    {
        name: "Line 56 (p)",
        from: "ves gafas malas, otras te confunden.",
        to: "ves réplicas deficientes, otras te confunden."
    },
    {
        name: "Line 57 (p)",
        from: "Tienen que estar bien hechas, las monturas",
        to: "Deben exhibir acabados impecables, las monturas"
    },
    {
        name: "Line 58 (p)",
        from: "ir a lo seguro conviene, lee esta guía",
        to: "asegurar la autenticidad conviene, lee esta guía"
    },
    {
        name: "Line 59 (p)",
        from: "Gucci es la reina de las",
        to: "Gucci es referente de las"
    },
    {
        name: "Line 61 (p)",
        from: "da tres consejos fáciles, elevan",
        to: "da tres recomendaciones prácticas, elevan"
    },
    {
        name: "Line 63 (p)",
        from: "las gafas se notan más, la gente voltea,",
        to: "las gafas se notan más, atrayendo miradas,"
    },
    {
        name: "Line 65 (p)",
        from: "Juntas prendas viejas y toques modernos",
        to: "Juntas piezas clásicas y toques modernos"
    },
    {
        name: "Line 67 (p)",
        from: "Esa ropa suelta da un toque tranquilo,",
        to: "Esa ropa suelta da un aire desenfadado,"
    },
    {
        name: "Line 69 (p)",
        from: "dan una sensación rara, cubren medio rostro",
        to: "dan una sensación singular, cubren medio rostro"
    },
    {
        name: "Line 70 (p)",
        from: "Ese es el lujo de verdad, tú decides",
        to: "Ese es el auténtico lujo, tú decides"
    }
];

let pass2_content = pass1_content;
for (const rep of pass2_replacements) {
    if (!pass2_content.includes(rep.from)) {
        console.error(`ERROR: Target not found for Pass 2: "${rep.from}"`);
        process.exit(1);
    }
    pass2_content = pass2_content.replace(rep.from, rep.to);
}

fs.writeFileSync(path.join(taskDir, 'surg_pass_2.html'), pass2_content, 'utf8');
console.log('surg_pass_2.html written successfully.');

// Pass 3 replacements per chunk (applied cumulatively on surg_pass_2.html)
const pass3_replacements = [
    {
        name: "Line 2 (p)",
        from: "son como una máscara, cubren gran parte",
        to: "emulan una máscara, cubren gran parte"
    },
    {
        name: "Line 4 (p)",
        from: "Vamos a revisar los detalles, analizaremos",
        to: "Examinaremos los detalles, analizaremos"
    },
    {
        name: "Line 6 (li 1)",
        from: "bloquean el sol, la protección visual",
        to: "bloquean la radiación solar, la protección visual"
    },
    {
        name: "Line 7 (li 2)",
        from: "la montura sigue igual.",
        to: "la montura permanece inalterada."
    },
    {
        name: "Line 8 (li 3)",
        from: "olvidas limpiar a cada rato, el mantenimiento",
        to: "olvidas limpiar constantemente, el mantenimiento"
    },
    {
        name: "Line 10 (p)",
        from: "La gente mira esto últimamente, la marca",
        to: "Crece el interés por la propuesta, la marca"
    },
    {
        name: "Line 48 (p)",
        from: "no solo copian cosas viejas. Rescataron",
        to: "no solo copian diseños del pasado. Rescataron"
    },
    {
        name: "Line 49 (p)",
        from: "las tendencias en gafas de sol para la temporada primavera-verano</a> muestran eso.",
        to: "las tendencias en gafas de sol para la temporada primavera-verano</a> así lo reflejan."
    },
    {
        name: "Line 50 (p)",
        from: "te ves muy bien, asistes a eventos",
        to: "luces sofisticado, asistes a eventos"
    },
    {
        name: "Line 52 (p)",
        from: "El mercado caro se partió en dos lados",
        to: "El sector exclusivo se partió en dos lados"
    },
    {
        name: "Line 53 (p)",
        from: "Gucci busca el brillo viejo, crean",
        to: "Gucci busca el encanto vintage, crean"
    },
    {
        name: "Line 54 (p)",
        from: "Parecen estatuas en la cara, resaltan",
        to: "Evocan esculturas en la cara, resaltan"
    },
    {
        name: "Line 56 (p)",
        from: "garantizando una compra segura, evitas problemas.",
        to: "garantizando una compra segura, previenes contratiempos."
    },
    {
        name: "Line 57 (p)",
        from: "no hacen ruido nunca. Evita",
        to: "sin fricción ni ruidos. Evita"
    },
    {
        name: "Line 58 (p)",
        from: "nunca les salen precisos, la falsificación",
        to: "rara vez resultan precisos, la falsificación"
    },
    {
        name: "Line 59 (p)",
        from: "Estas gafas no sirven solo para presumir, duran",
        to: "Estas gafas trascienden la mera ostentación, duran"
    },
    {
        name: "Line 61 (p)",
        from: "sirven para caminar en la calle, te preparas",
        to: "sirven para recorrer la ciudad, te preparas"
    },
    {
        name: "Line 63 (p)",
        from: "usas las zapatillas de siempre. Escoges",
        to: "usas tus sneakers favoritas. Escoges"
    },
    {
        name: "Line 65 (p)",
        from: "Haces este truco rápido, logrando",
        to: "Logras este contraste rápido, logrando"
    },
    {
        name: "Line 67 (p)",
        from: "agarras unos lentes enormes marrones o amarillos,",
        to: "eliges unas gafas enormes marrones o amarillos,"
    },
    {
        name: "Line 69 (p)",
        from: "La cosa buena es mirar a otros",
        to: "La gran ventaja es mirar a otros"
    },
    {
        name: "Line 70 (p)",
        from: "los famosos se tapan la cara con lentes enormes",
        to: "los famosos ocultan sus facciones con lentes enormes"
    }
];

let pass3_content = pass2_content;
for (const rep of pass3_replacements) {
    if (!pass3_content.includes(rep.from)) {
        console.error(`ERROR: Target not found for Pass 3: "${rep.from}"`);
        process.exit(1);
    }
    pass3_content = pass3_content.replace(rep.from, rep.to);
}

fs.writeFileSync(path.join(taskDir, 'surg_pass_3.html'), pass3_content, 'utf8');
console.log('surg_pass_3.html written successfully.');
