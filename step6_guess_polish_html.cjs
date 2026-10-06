const fs = require('fs');

let html = fs.readFileSync('guess_step5_pruned.html', 'utf8');

// --- FASE 6: LIMPIEZA DE HTML, LISTAS, EMOJIS, INGLÉS Y ENLACES ---

// 1. Separar correctamente la Lista de Contrastes para Rostros Redondos
// donde el 1er ítem estaba en un <ul> aparte y "Lo que mejor ni intentes" estaba metido como un <li>
html = html.replace(
  /<p><strong>✔️ Las monturas que te van mejor:<\/strong><\/p><ul><li><p>(.*?)<\/p><\/li><\/ul><ul><li><p>(.*?)<\/p><\/li><li><p>(.*?)<\/p><\/li><li><p><strong>❌ Lo que mejor ni intentes:<\/strong><\/p><\/li><li><p>(.*?)<\/p><\/li><li><p>(.*?)<\/p><\/li><li><p>(.*?)<\/p><\/li><\/ul>/s,
  '<p><strong>Las monturas que te van mejor:</strong></p>\n<ul>\n  <li>$1</li>\n  <li>$2</li>\n  <li>$3</li>\n</ul>\n<p><strong>Lo que mejor ni intentes:</strong></p>\n<ul>\n  <li>$4</li>\n  <li>$5</li>\n  <li>$6</li>\n</ul>'
);

// 2. Eliminar la lista vacía <ul><li><p></p></li></ul> o <ul><li></li></ul> en la sección de Rostro Cuadrado
html = html.replace(/<ul>\s*<li>\s*(?:<p>\s*<\/p>)?\s*<\/li>\s*<\/ul>/g, '');

// 3. Unificar la lista de Cortes de Pelo que tenía el ítem 1 en <ol> y los ítems 2-4 en <ul>
html = html.replace(
  /<ol><li><p>(<strong>Fíjate cuánto resaltan tus lentes:<\/strong>.*?)<\/p><\/li><\/ol><ul><li><p>(<strong>Pelo con mucho volumen y curvas:<\/strong>.*?)<\/p><\/li><li><p>(<strong>Despeja los laterales para monturas tipo joya:<\/strong>.*?)<\/p><\/li><li><p>(<strong>Cuidado con el flequillo y los lentes de diseño:<\/strong>.*?)<\/p><\/li><\/ul>/s,
  '<ul>\n  <li>$1</li>\n  <li>$2</li>\n  <li>$3</li>\n  <li>$4</li>\n</ul>'
);

// 4. Quitar todos los <p> anidados dentro de <li> en el resto de las listas
html = html.replace(/<li>\s*<p>(.*?)<\/p>\s*<\/li>/gs, '<li>$1</li>');

// 5. Traducir subtítulos/etiquetas en inglés ("(Pro Tip)")
html = html.replace('Consejo de Experto (Pro Tip):', 'Consejo de Experto:');

// 6. Eliminar TODOS los emojis restantes (💡, ✔️, ❌, ⚠️, etc.)
html = html.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2B50}\u{FE0F}]/gu, '');
html = html.replace(/<strong>\s+/g, '<strong>');
html = html.replace(/<li>\s+/g, '<li>');
html = html.replace(/<p>\s+/g, '<p>');

// 7. Quitar BOM inicial si existe
html = html.replace(/^\uFEFF/, '');

fs.writeFileSync('guess_step6_polished.html', html, 'utf8');
console.log('Fase 6 completada. Guardado en guess_step6_polished.html (longitud:', html.length, ')');
