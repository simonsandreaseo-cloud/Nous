const fs = require('fs');

let html = fs.readFileSync('guess_step4_models.html', 'utf8');

// --- FASE 5: REORDENAMIENTO ESTRUCTURAL Y PODA DE CONTENIDO IRRELEVANTE ---

// 1. Unificar el doble H2 redundante de la Guía de Formas de Rostro
html = html.replace(
  '<h2>¿Qué gafas  Guess me quedan bien?</h2><h2><span style="font-size: 20px;"><em>Guía de Formas de Rostro</em></span></h2>',
  '<h2>¿Qué gafas Guess me quedan bien? Guía de Formas de Rostro</h2>'
);

// 2. Eliminar la sección/bloques irrelevantes de otras marcas (Tabla Miu Miu / Prada, H3 Miu Miu y H3 Prada)
// Conservamos únicamente el bloque relevante sobre el estilo Piloto/Aviador en Guess bajo un H2 limpio
const startIrrelevant = html.indexOf('<h2>Tendencias Futuras y Alternativas de Marcas de Diseñador</h2>');
const startAviator = html.indexOf('<h3>Tendencias de Gafas Aviador 2026</h3>');
const startMiuMiu = html.indexOf('<h3>Gafas de Sol Miu Miu</h3>');

if (startIrrelevant !== -1 && startAviator !== -1 && startMiuMiu !== -1) {
  const aviatorSection = html.substring(startAviator, startMiuMiu)
    .replace('<h3>Tendencias de Gafas Aviador 2026</h3>', '<h2>Tendencias de Gafas Aviador en la Colección Guess</h2>')
    .replace('<p><strong>📈 Lo que se viene: vuelven con todo los clásicos lentes de piloto</strong></p>', '');
  html = html.substring(0, startIrrelevant) + aviatorSection;
}

// 3. Limpiar frases fuera de lugar o rotas en el texto sin alterar la prosa general
html = html.replace('Pesan muy poco, se apoyan en los pómulos y cambian. ', 'Pesan muy poco y se apoyan suavemente en los pómulos. ');
html = html.replace('el plástico de acetato premium resiste las notas muy seguras puestas.', 'el plástico de acetato premium resiste el uso diario y las sientes muy seguras puestas.');
html = html.replace('la rostro se afina hacia abajo y termina en una barbilla fina,.', 'el rostro se afina hacia abajo y termina en una barbilla fina.');
html = html.replace('quitarle lo ancho,.', 'quitarle lo ancho.');
html = html.replace(', vas a parecer una pelota.', '.');
html = html.replace('te alargan la cara bastante por el apuro en la óptica.', 'te alargan la cara bastante.');

// Eliminar etiqueta <p></p> vacía al final si existe
html = html.replace(/<p>\s*<\/p>/g, '');

fs.writeFileSync('guess_step5_pruned.html', html, 'utf8');
console.log('Fase 5 completada. Guardado en guess_step5_pruned.html (longitud:', html.length, ')');
