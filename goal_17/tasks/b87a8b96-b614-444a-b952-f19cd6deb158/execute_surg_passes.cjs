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
    // Chunk 1 (43w): "ese" -> "célebre"
    ['El actor ese Steve McQueen', 'El actor célebre Steve McQueen'],
    // Chunk 3 (41w): "esos" -> "característicos"
    ['los cristales esos del actor', 'los cristales característicos del actor'],
    // Chunk 21 (77w): "frikis" -> "entusiastas"
    ['A los frikis de lo viejo', 'A los entusiastas de lo viejo'],
    // Chunk 24 (59w): "ese" -> "patentado"
    ['el Meflecto ese que hace', 'el Meflecto patentado que hace'],
    // Chunk 25 (30w): "Cosas" -> "Detalles"
    ['<strong>Cosas del Frente:</strong>', '<strong>Detalles del Frente:</strong>'],
    // Chunk 26 (40w): "ciega" -> "deslumbra"
    ['y te ciega la carretera', 'y te deslumbra la carretera'],
    // Chunk 27 (25w): "joden" -> "incomodan"
    ['no se mueven ni te joden si las', 'no se mueven ni te incomodan si las'],
    // Chunk 30 (40w): "ropa." -> "atuendo."
    ['con cualquier ropa.', 'con cualquier atuendo.'],
    // Chunk 31 (31w): "agarran" -> "asientan"
    ['se agarran en la nariz', 'se asientan en la nariz'],
    // Chunk 32 (23w): "Calentito:" -> "Cálido:"
    ['<strong>Se ve Calentito:</strong>', '<strong>Se ve Cálido:</strong>'],
    // Chunk 33 (30w): "pa" -> "para"
    ['metal pa doblar con', 'metal para doblar con'],
    // Chunk 36 (83w): "pa" -> "para"
    ['lados pa que las dobles', 'lados para que las dobles'],
    // Chunk 37 (31w): "pelis" -> "películas"
    ['714 de las pelis no estaban', '714 de las películas no estaban'],
    // Chunk 39 (97w): "pa" -> "para"
    ['No es pa que quede bonito', 'No es para que quede bonito'],
    // Chunk 41 (23w): "pasta" -> "dinero"
    ['Cuida tu pasta y compra', 'Cuida tu dinero y compra'],
    // Chunk 42 (68w): "Pa" -> "Para"
    ['con lupa. Pa montar unas', 'con lupa. Para montar unas'],
    // Chunk 44 (48w): "pelis" -> "películas"
    ['en las pelis porque se doblan', 'en las películas porque se doblan'],
    // Chunk 46 (35w): "pa" -> "para"
    ['<strong>Protección pa los rayos:</strong>', '<strong>Protección para los rayos:</strong>'],
    // Chunk 47 (42w): "cosas" -> "filtros"
    ['tienen unas cosas que te quitan', 'tienen unos filtros que te quitan'],
    // Chunk 48 (42w): "verdad" -> "auténtico"
    ['<strong>Cristal de verdad mineral:</strong>', '<strong>Cristal de auténtico mineral:</strong>'],
    // Chunk 49 (49w): "tapa" -> "cubre"
    ['<strong>Te tapa bien la cara:</strong>', '<strong>Te cubre bien la cara:</strong>'],
    // Chunk 51 (46w): "pa" -> "para"
    ['neodimio pa limpiar la luz.', 'neodimio para limpiar la luz.'],
    // Chunk 53 (33w): "guarro." -> "ordinario."
    ['de plástico guarro.', 'de plástico ordinario.'],
    // Chunk 54 (31w): "relajao." -> "relajado."
    ['se queda relajao.</li>', 'se queda relajado.</li>'],
    // Chunk 55 (31w): "lujo." -> "maravilla."
    ['todo de lujo.</li>', 'todo de maravilla.</li>'],
    // Chunk 56 (24w): "Aguantan" -> "Soportan"
    ['<strong>Duran la de dios:</strong> Aguantan el frío', '<strong>Duran la de dios:</strong> Soportan el frío'],
    // Chunk 58 (33w): "pa" -> "para"
    ['el Meflecto pa que no te pesen', 'el Meflecto para que no te pesen'],
    // Chunk 59 (31w): "pa" -> "para"
    ['su caja dura pa que no se rompan', 'su caja dura para que no se rompan'],
    // Chunk 61 (47w): "pa" -> "para"
    ['cuidar pa que la suciedad', 'cuidar para que la suciedad'],
    // Chunk 62 (48w): "lías." -> "dañas."
    ['los cristales y la lías.', 'los cristales y la dañas.'],
    // Chunk 63 (41w): "joder" -> "dañar"
    ['<strong>Secar sin joder la capa esa:</strong>', '<strong>Secar sin dañar la capa esa:</strong>'],
    // Chunk 64 (50w): "pa" -> "para"
    ['los hierros pa doblar:</strong>', 'los hierros para doblar:</strong>'],
    // Chunk 65 (44w): "pa" -> "para"
    ['pincelito suave pa limpiar los', 'pincelito suave para limpiar los'],
    // Chunk 66 (38w): "jode." -> "deforma."
    ['el acetato se jode.</li>', 'el acetato se deforma.</li>'],
    // Chunk 68 (33w): "mola" -> "gusta"
    ['Como mola tanto lo de doblar', 'Como gusta tanto lo de doblar'],
    // Chunk 69 (47w): "cacho" -> "pieza"
    ['luz el cacho de metal', 'luz la pieza de metal'],
    // Chunk 70 (40w): "pa" -> "para"
    ['poquillo pa fuera y vuelven', 'poquillo para fuera y vuelven'],
    // Chunk 71 (45w): "pintao" -> "grabado"
    ['el logo pintao en el cristal', 'el logo grabado en el cristal'],
    // Chunk 72 (32w): "repartio" -> "repartido"
    ['bien repartio por el cristal', 'bien repartido por el cristal'],
    // Chunk 74 (39w): "pa" -> "para"
    ['muy suave pa tocarlo y los', 'muy suave para tocarlo y los'],
    // Chunk 75 (25w): "rajao" -> "rajado"
    ['se ha rajao un poco por', 'se ha rajado un poco por'],
    // Chunk 76 (30w): "bruto" -> "brusco"
    ['a lo bruto tirando con', 'a lo brusco tirando con'],
    // Chunk 77 (65w): "bestia." -> "fuerza."
    ['así a lo bestia. El pegamento', 'así a la fuerza. El pegamento'],
    // Chunk 79 (28w): "Pillarte" -> "Comprar"
    ['Pillarte tus <strong>Persol', 'Comprar tus <strong>Persol'],
    // Chunk 80 (44w): "papelajo" -> "certificado"
    ['y el papelajo ese que dice', 'y el certificado ese que dice'],
    // Chunk 81 (46w): "pa" -> "para"
    ['hierros pa doblar el tío', 'hierros para doblar el tío'],
    // Chunk 82 (46w): "Pa" -> "Para"
    ['<strong>Que te ayudan en persona:</strong> Pa saber', '<strong>Que te ayudan en persona:</strong> Para saber']
];

// PASS 2 REPLACEMENTS (applied on surg_pass_1.html)
const pass2_replacements = [
    // Chunk 1 (43w): "quedan" -> "lucen"
    ['puestas quedan espectaculares.', 'puestas lucen espectaculares.'],
    // Chunk 3 (41w): "molestan" -> "incomodan"
    ['a ver si molestan y', 'a ver si incomodan y'],
    // Chunk 21 (77w): "el" -> "Steve"
    ['que el McQueen llevaba', 'que Steve McQueen llevaba'],
    // Chunk 24 (59w): "muelle" -> "resorte"
    ['hace de muelle para', 'hace de resorte para'],
    // Chunk 25 (30w): "raro" -> "singular"
    ['puente raro ese hace', 'puente singular ese hace'],
    // Chunk 26 (40w): "vas" -> "conduces"
    ['Si vas mucho en coche', 'Si conduces mucho en coche'],
    // Chunk 27 (25w): "agarra" -> "sujeta"
    ['te agarra sin dolor', 'te sujeta sin dolor'],
    // Chunk 30 (40w): "gustan" -> "fascinan"
    ['gustan bastante de acetato', 'fascinan bastante de acetato'],
    // Chunk 31 (31w): "duelen" -> "molestan"
    ['no duelen y no se', 'no molestan y no se'],
    // Chunk 32 (23w): "esa" -> "excesiva"
    ['luz azul esa y ves', 'luz azul excesiva y ves'],
    // Chunk 33 (30w): "cosas" -> "piezas"
    ['Las cosas esas de metal', 'Las piezas esas de metal'],
    // Chunk 36 (83w): "hierros" -> "bisagras"
    ['Tienen hierros en el medio', 'Tienen bisagras en el medio'],
    // Chunk 37 (31w): "rollo" -> "estilo"
    ['al rollo de tipo duro', 'al estilo de tipo duro'],
    // Chunk 39 (97w): "pa" -> "para" (second occurrence)
    ['rompían pa pilotos y', 'rompían para pilotos y'],
    // Chunk 41 (23w): "buenas" -> "oficiales"
    ['en tiendas buenas que está', 'en tiendas oficiales que está'],
    // Chunk 42 (68w): "timen" -> "engañen"
    ['Que no te timen y mira', 'Que no te engañen y mira'],
    // Chunk 44 (48w): "más." -> "primordial."
    ['son lo más. Los hacen', 'son lo primordial. Los hacen'],
    // Chunk 46 (35w): "paran" -> "bloquean"
    ['estos paran todos los rayos', 'estos bloquean todos los rayos'],
    // Chunk 47 (42w): "ciegas" -> "deslumbras"
    ['Así no te ciegas y no', 'Así no te deslumbras y no'],
    // Chunk 48 (42w): "tires" -> "pases"
    ['aunque te tires horas mirando', 'aunque te pases horas mirando'],
    // Chunk 49 (49w): "corta" -> "bloquea"
    ['y te corta el aire y', 'y te bloquea el aire y'],
    // Chunk 51 (46w): "echan" -> "añaden"
    ['le echan polvos raros de', 'le añaden polvos raros de'],
    // Chunk 53 (33w): "caña" -> "uso"
    ['que le des caña y no', 'que le des uso y no'],
    // Chunk 54 (31w): "súper" -> "sumamente"
    ['ver súper nítido y', 'ver sumamente nítido y'],
    // Chunk 55 (31w): "brillo" -> "resplandor"
    ['quitan el brillo ese amarillo', 'quitan el resplandor ese amarillo'],
    // Chunk 56 (24w): "mil" -> "muchos"
    ['transparentes mil años.</li>', 'transparentes muchos años.</li>'],
    // Chunk 58 (33w): "pelín" -> "poco"
    ['<strong>Pesan un pelín más:</strong>', '<strong>Pesan un poco más:</strong>'],
    // Chunk 59 (31w): "hierros" -> "herrajes"
    ['ni los hierros de doblar.</li>', 'ni los herrajes de doblar.</li>'],
    // Chunk 61 (47w): "pa" -> "para" (second occurrence)
    ['Limpialas así pa que duren:', 'Limpialas así para que duren:'],
    // Chunk 62 (48w): "cargas" -> "estropeas"
    ['caliente te cargas el plástico.', 'caliente te estropeas el plástico.'],
    // Chunk 63 (41w): "pa" -> "para"
    ['del medio pa fuera sin', 'del medio para fuera sin'],
    // Chunk 64 (50w): "trozos" -> "piezas"
    ['Mira esos trozos de acero', 'Mira esas piezas de acero'],
    // Chunk 65 (44w): "asqueroso" -> "acumulado"
    ['el sudor asqueroso que se', 'el sudor acumulado que se'],
    // Chunk 66 (38w): "meterlas:" -> "guardarlas:"
    ['<strong>Dónde meterlas:</strong>', '<strong>Dónde guardarlas:</strong>'],
    // Chunk 68 (33w): "pega" -> "imitación"
    ['cristales de pega y hierros', 'cristales de imitación y hierros'],
    // Chunk 69 (47w): "asqueroso" -> "visible"
    ['pegamento asqueroso por ahí.</li>', 'pegamento visible por ahí.</li>'],
    // Chunk 70 (40w): "hierros" -> "varillas"
    ['llevan hierros dentro de la', 'llevan varillas dentro de la'],
    // Chunk 71 (45w): "firmita" -> "firma"
    ['y la firmita del Steve', 'y la firma del Steve'],
    // Chunk 72 (32w): "currados" -> "elaborados"
    ['tan currados y al cerrarse', 'tan elaborados y al cerrarse'],
    // Chunk 74 (39w): "plástico" -> "material"
    ['Ese plástico del acetato es', 'Ese material del acetato es'],
    // Chunk 75 (25w): "hierro" -> "soporte"
    ['El hierro del puente está', 'El soporte del puente está'],
    // Chunk 76 (30w): "caja" -> "funda"
    ['bolsillo sin la caja o se', 'bolsillo sin la funda o se'],
    // Chunk 77 (65w): "mueva el hierro" -> "mueva la bisagra"
    ['mueva el hierro vete al', 'mueva la bisagra vete al'],
    // Chunk 79 (28w): "timen" -> "engañen"
    ['no te timen y te duren', 'no te engañen y te duren'],
    // Chunk 80 (44w): "trapito" -> "paño"
    ['marca el trapito y el', 'marca el paño y el'],
    // Chunk 81 (46w): "pa" -> "para" (second occurrence)
    ['aprieta pa tu cara. Así', 'aprieta para tu cara. Así'],
    // Chunk 82 (46w): "pillas" -> "seleccionas"
    ['Para saber si pillas las de', 'Para saber si seleccionas las de']
];

// PASS 3 REPLACEMENTS (applied on surg_pass_2.html)
const pass3_replacements = [
    // Chunk 1 (43w): "hito." -> "referente."
    ['fueran un hito. Estas', 'fueran un referente. Estas'],
    // Chunk 3 (41w): "rápido." -> "ágilmente."
    ['para que elijas rápido.</p>', 'para que elijas ágilmente.</p>'],
    // Chunk 21 (77w): "pum" -> "pronto"
    ['las tocas y pum sabes', 'las tocas y pronto sabes'],
    // Chunk 24 (59w): "montón" -> "sinfín"
    ['puestas un montón de horas', 'puestas un sinfín de horas'],
    // Chunk 25 (30w): "ese" -> "curvado"
    ['puente singular ese hace', 'puente singular curvado hace'],
    // Chunk 26 (40w): "tuyo" -> "ideal"
    ['polarizadas</a> son lo tuyo los', 'polarizadas</a> son lo ideal los'],
    // Chunk 27 (25w): "ponerlas:" -> "llevarlas:"
    ['<strong>Para ponerlas:</strong>', '<strong>Para llevarlas:</strong>'],
    // Chunk 30 (40w): "nariz" -> "cara"
    ['quietas en la nariz a tope.', 'quietas en la cara a tope.'],
    // Chunk 31 (31w): "Cara:" -> "Fisonomía:"
    ['<strong>Para la Cara:</strong>', '<strong>Para la Fisonomía:</strong>'],
    // Chunk 32 (23w): "ves" -> "distingues"
    ['excesiva y ves lejos', 'excesiva y distingues lejos'],
    // Chunk 33 (30w): "rato" -> "tiempo"
    ['todo el rato y no', 'todo el tiempo y no'],
    // Chunk 36 (83w): "El" -> "El actor"
    ['649 pero se doblaban. El Steve McQueen', '649 pero se doblaban. El actor Steve McQueen'],
    // Chunk 37 (31w): "cristo." -> "entusiasta."
    ['quiere todo cristo.</p>', 'quiere todo entusiasta.</p>'],
    // Chunk 39 (97w): "frikis" -> "expertos"
    ['los frikis miran esto lo', 'los expertos miran esto lo'],
    // Chunk 41 (23w): "malísimas" -> "defectuosas"
    ['gafas chinas malísimas que', 'gafas chinas defectuosas que'],
    // Chunk 42 (68w): "cositas" -> "detalles"
    ['mira estas cositas con la', 'mira estos detalles con la'],
    // Chunk 44 (48w): "increíbles" -> "excelentes"
    ['materiales increíbles y te protegen', 'materiales excelentes y te protegen'],
    // Chunk 46 (35w): "cuidan" -> "protegen"
    ['y cuidan tu ojo y', 'y protegen tu ojo y'],
    // Chunk 47 (42w): "ahí." -> "carretera."
    ['conduces por ahí.</li>', 'conduces por carretera.</li>'],
    // Chunk 48 (42w): "dobla" -> "deforma"
    ['se dobla el cristal óptico', 'se deforma el cristal óptico'],
    // Chunk 49 (49w): "rato." -> "tiempo."
    ['cómodo mucho rato.</li>', 'cómodo mucho tiempo.</li>'],
    // Chunk 51 (46w): "pegan" -> "resaltan"
    ['los colores pegan fuerte y', 'los colores resaltan fuerte y'],
    // Chunk 53 (33w): "rollo" -> "tipo"
    ['Este rollo de material no', 'Este tipo de material no'],
    // Chunk 54 (31w): "raros" -> "alterados"
    ['lado no se ven raros y', 'lado no se ven alterados y'],
    // Chunk 55 (31w): "raras" -> "selectas"
    ['tierras esas raras nivelan', 'tierras esas selectas nivelan'],
    // Chunk 56 (24w): "ponen" -> "vuelven"
    ['no se ponen turbias ni', 'no se vuelven turbias ni'],
    // Chunk 58 (33w): "malo" -> "básico"
    ['plástico ese malo y por', 'plástico ese básico y por'],
    // Chunk 59 (31w): "Ojo" -> "Cuidado"
    ['<strong>Ojo si se te caen', '<strong>Cuidado si se te caen'],
    // Chunk 61 (47w): "hierros." -> "articulaciones."
    ['dañar los hierros. Llevan', 'dañar las articulaciones. Llevan'],
    // Chunk 62 (48w): "agüita" -> "agua"
    ['<strong>A lavarlas con agüita del', '<strong>A lavarlas con agua del'],
    // Chunk 63 (41w): "pañito" -> "paño"
    ['Coge el pañito ese de microfibra', 'Coge el paño ese de microfibra'],
    // Chunk 64 (50w): "bestia." -> "brusco."
    ['no tires a lo bestia.</li>', 'no tires a lo brusco.</li>'],
    // Chunk 65 (44w): "tubitos" -> "cilindros"
    ['<strong>A limpiar los tubitos del', '<strong>A limpiar los cilindros del'],
    // Chunk 66 (38w): "cajita" -> "estuche"
    ['en su cajita de pasta', 'en su estuche de pasta'],
    // Chunk 68 (33w): "hierros" -> "bisagras"
    ['y hierros de chiste. Mira', 'y bisagras de chiste. Mira'],
    // Chunk 69 (47w): "pegadita" -> "nivelada"
    ['Suprema pegadita al acetato:</strong>', 'Suprema nivelada al acetato:</strong>'],
    // Chunk 70 (40w): "piratas" -> "réplicas"
    ['pero las piratas le ponen', 'pero las réplicas le ponen'],
    // Chunk 71 (45w): "lo" -> "el"
    ['y lo del CE y', 'y el del CE y'],
    // Chunk 72 (32w): "hierros" -> "herrajes"
    ['los hierros de dentro tan', 'los herrajes de dentro tan'],
    // Chunk 74 (39w): "aplastas" -> "deformas"
    ['las aplastas o el puente', 'las deformas o el puente'],
    // Chunk 75 (25w): "tornillitos" -> "tornillos"
    ['los tornillitos están flojos', 'los tornillos están flojos'],
    // Chunk 76 (30w): "meter" -> "guardar"
    ['Por meter las gafas en', 'Por guardar las gafas en'],
    // Chunk 77 (65w): "hierro" -> "bisagra"
    ['doblar el hierro del medio', 'doblar la bisagra del medio'],
    // Chunk 79 (28w): "buena" -> "oficial"
    ['tienda buena como Óptica', 'tienda oficial como Óptica'],
    // Chunk 80 (44w): "cajita" -> "caja"
    ['en la cajita exclusiva de', 'en la caja exclusiva de'],
    // Chunk 81 (46w): "tío" -> "técnico"
    ['el tío de la óptica te', 'el técnico de la óptica te'],
    // Chunk 82 (46w): "tío" -> "asesor"
    ['si un tío de allí te', 'si un asesor de allí te']
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
    // 1. Tag-level chunks verification
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

    // 2. Line-by-line verification
    const prevLines = prevContent.split('\n');
    const newLines = newContent.split('\n');
    if (prevLines.length !== newLines.length) {
        throw new Error(`[${passLabel}] Line count mismatch: ${prevLines.length} vs ${newLines.length}`);
    }

    let maxLineLevRatio = 0;
    for (let l = 0; l < prevLines.length; l++) {
        const pLText = prevLines[l].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        const nLText = newLines[l].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

        const pLWords = pLText.split(/\s+/).filter(Boolean);
        const nLWords = nLText.split(/\s+/).filter(Boolean);

        const len = pLWords.length;
        if (len === 0) continue;

        const lLev = wordLevenshtein(pLWords, nLWords);
        const lRatio = lLev / len;
        if (lRatio > maxLineLevRatio) maxLineLevRatio = lRatio;

        if (lRatio >= 0.05) {
            throw new Error(`[${passLabel}] Line ${l + 1} STRICT LIMIT VIOLATION: ${(lRatio * 100).toFixed(2)}% >= 5%`);
        }
    }

    // 3. HTML tags verification
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

    console.log(`[${passLabel}] Verified: ${editedChunksCount} chunks edited.`);
    console.log(`  Max Chunk Lev: ${(maxLevRatio * 100).toFixed(2)}%, Max Chunk LCS: ${(maxLcsRatio * 100).toFixed(2)}%.`);
    console.log(`  Max Line Lev: ${(maxLineLevRatio * 100).toFixed(2)}%.`);
    console.log(`  All ${prevTags.length} HTML tags 100% identical.`);
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
