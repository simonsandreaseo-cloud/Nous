const fs = require('fs');
const path = require('path');

const dir = __dirname;
const text = fs.readFileSync(path.join(dir, 'base.html'), 'utf-8');

// Humanización
let h1 = text;
const reps_h1 = {
    "Explora las exclusivas gafas de sol": "Mira estas gafas de sol",
    "diseños hechos en Italia que deslumbran con su estética vanguardista, volúmenes esculturales y detalles artesanales de alta costura.": "son de Italia y se ven re bien. Tienen formas grandes y cositas hechas a mano, muy locas.",
    "Comprar lentes nuevos para esta temporada no tiene que ser un lío:": "Comprar lentes ahora es facilísimo, cero lío:",
    "elegimos tres opciones de la colección Primavera-Verano 2026 que se ven bien": "agarramos tres opciones de Primavera-Verano 2026 que están buenas",
    "al final destacan estos modelos equilibrados que sirven para salir a caminar sin que pesen en la nariz.": "son modelos que te pones para salir y ni los sentís en la nariz.",
    "Nos fijamos en tres detalles simples para elegirlas:": "Miramos tres cosas:",
    "el marco tiene que aguantar el uso diario": "que el marco aguante todo el día",
    "el peso debe sentirse parejo en las patillas": "que no pesen casi nada",
    "los cristales tienen que tapar el sol sin alterar los colores.": "que los cristales tapen el sol bien.",
    "Llevan el sello metálico a los lados, calzan bien en la cara y no molestan para nada después de varias horas puestas.": "Tienen el cosito de metal al lado, te quedan re bien y no joden.",
    "destacan en la campaña SS26 por su silueta ovalada de inspiración <em>cat-eye</em> y su acetato pulido a mano.": "son lo más en la campaña SS26, con forma ovalada tipo <em>cat-eye</em> y pulidas a mano.",
    "El modelo 501/87 (referencia oficial <em>VG4537VP187</em>) es de color negro brillante, con cristales gris oscuro de categoría 3 que cubren muy bien la luz del sol para el día a día y el emblema del Sagrado Corazón en las varillas.": "El 501/87 (o sea <em>VG4537VP187</em>) es negro brillante. Tiene cristales grises que tapan el sol re bien y el corazón en la patilla.",
    "Las bisagras metálicas son bastante firmes y aguantan el uso continuo sin aflojarse con los meses.": "Las bisagras de metal son duras y no se aflojan con el tiempo.",
    "El puente queda bien asentado y así no se te resbalan de la nariz.": "Se agarran bien a la nariz y no se caen.",
    "Mide 53 mm y queda muy bien en rostros femeninos de proporciones medias, estilizando los pómulos sin incomodar al usarlas.": "Mide 53 mm. Queda súper en caras normales, te hace ver bien los pómulos y no molesta.",
    "Está hecho de acetato de alta densidad que soporta bien los cambios de temperatura del día a día y conserva su brillo durante años.": "Es de un plástico grueso que se aguanta el calor y el frío y no pierde el brillo.",
    "Incorpora lentes oscuras con protección 100% frente a los rayos UVA y UVB.": "Trae lentes oscuras que te cuidan 100% de los rayos feos del sol.",
    "Son de diseño italiano, vienen con su estuche oficial de fábrica y garantía de autenticidad": "Son diseño italiano, traen su cajita de fábrica y garantía",
    "queda bien con casi todo y es muy práctico para usar a diario.": "pega con todo y es re práctico para todos los días.",
    "este diseño oversize apuesta por el carey tradicional, mezclando tonos miel y castaño con lentes marrones degradadas y el Sagrado Corazón dorado en la patilla.": "este diseño grandote es puro carey, mezcla color miel y castaño con lentes marrones y el corazón dorado al lado.",
    "Las varillas anchas se sienten firmes, con el alma metálica interior reforzando el acetato para darle gran resistencia.": "Las patillas son anchas y duras, tienen metal adentro para que no se rompan.",
    "La combinación de colores cálidos con los detalles barrocos consigue un efecto visual muy favorecedor:": "Los colores cálidos con los adornos locos quedan re bien:",
    "Su silueta amplia de 55 mm con líneas suavizadas equilibra los rasgos marcados y favorece especialmente a rostros ovalados, cuadrados o rectangulares.": "Mide 55 mm y es grandota, queda joya en caras ovaladas o cuadradas.",
    "El puente anatómico integrado en el propio acetato reparte el peso sin apretar, por lo que puedes usarlas todo el día sin que dejen marca.": "No te aprieta nada la nariz, las podés usar todo el día y cero marcas.",
    "Para cerrar el podio está el DG4532, un modelo que encarna la vanguardia del <em>eyewear</em> de lujo de esta temporada.": "Y por último el DG4532, un modelo súper moderno.",
    "Es un diseño de calibre 53 que se sale de lo convencional: tiene bordes biselados bien rectos y un marco esculpido que hace que la luz pegue distinto.": "Es talle 53 y re raro: bordes rectos y un marco que hace que brille raro."
};

for (const [k, v] of Object.entries(reps_h1)) {
    h1 = h1.split(k).join(v);
}
fs.writeFileSync(path.join(dir, 'hum1.html'), h1, 'utf-8');

// Edición Quirúrgica 1
let s1 = h1;
const reps_s1 = {
    "Mira estas gafas": "Descubre estas gafas",
    "se ven re bien": "lucen muy bien",
    "cositas hechas a mano": "detalles hechos a mano",
    "cero lío": "sin problemas",
    "que están buenas": "que son atractivas",
    "ni los sentís en la nariz.": "ni los sientes en la nariz.",
    "Miramos tres cosas:": "Observamos tres cosas:",
    "Tienen el cosito de metal": "Incluyen el detalle de metal",
    "y no joden.": "y son cómodas.",
    "son lo más": "destacan mucho",
    "tipo <em>cat-eye</em>": "estilo <em>cat-eye</em>",
    "re bien": "muy bien",
    "Se agarran bien": "Se ajustan bien",
    "Queda súper en caras normales": "Luce bien en rostros normales",
    "rayos feos del sol": "rayos dañinos",
    "pega con todo": "combina con todo",
    "diseño grandote": "diseño grande",
    "adornos locos": "adornos llamativos",
    "queda joya": "luce excelente",
    "cero marcas": "sin dejar marcas",
    "súper moderno": "muy actual",
    "re raro": "muy original"
};

for (const [k, v] of Object.entries(reps_s1)) {
    s1 = s1.split(k).join(v);
}
fs.writeFileSync(path.join(dir, 'surg1.html'), s1, 'utf-8');

// Edición Quirúrgica 2
let s2 = s1;
const reps_s2 = {
    "Descubre estas gafas": "Explora estas gafas",
    "lucen muy bien": "destacan visualmente",
    "detalles hechos a mano, muy locas.": "detalles artesanales singulares.",
    "Comprar lentes ahora es facilísimo": "Adquirir lentes ahora es muy sencillo",
    "que son atractivas": "que resultan favorecedoras",
    "ni los sientes en la nariz.": "son extremadamente ligeras.",
    "Observamos tres cosas:": "Evaluamos tres aspectos:",
    "Incluyen el detalle de metal": "Presentan el aplique metálico",
    "y son cómodas.": "y brindan confort.",
    "destacan mucho": "resaltan",
    "tapan el sol": "bloquean el sol",
    "Luce bien en rostros normales": "Favorece a rostros promedio",
    "un plástico grueso": "un material resistente",
    "combina con todo": "es muy versátil",
    "diseño grande": "diseño amplio",
    "luce excelente": "sienta perfecto",
    "muy actual": "contemporáneo",
    "muy original": "inédito"
};

for (const [k, v] of Object.entries(reps_s2)) {
    s2 = s2.split(k).join(v);
}
fs.writeFileSync(path.join(dir, 'surg2.html'), s2, 'utf-8');
console.log('All files saved successfully!');
