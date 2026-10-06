const fs = require('fs');

let html = fs.readFileSync('task_final_polished_authentic.html', 'utf8');

// 1. Remove ALL emojis (🕶️, ⭐, ⚠️, 💡, etc.)
html = html.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2B50}\u{FE0F}]/gu, '');
// Clean up any double spaces after `<li> ` due to emoji removal
html = html.replace(/<li>\s+/g, '<li>');
html = html.replace(/<p>\s+/g, '<p>');

// 2. Fix headers with slug format
html = html.replace(
  '<h3>gafas-dolce-gabbana-originales: Autenticidad en la Exclusividad</h3>',
  '<h3>Gafas Dolce&amp;Gabbana Originales: Autenticidad en la Exclusividad</h3>'
);
html = html.replace(
  '<h3>eyewear-aviator-2026-trends: El Futuro del Diseño Clásico</h3>',
  '<h3>Tendencias en Gafas Aviator 2026: El Futuro del Diseño Clásico</h3>'
);
html = html.replace(
  '<h3>gafas-pasta-metal-cuales-mejores: Análisis de Materiales de Montura</h3>',
  '<h3>Gafas de Pasta o Metal: Análisis de Materiales de Montura</h3>'
);

// 3. Remove forced/orphan links and misplaced collection shortcodes
// Remove forced link in Model 1 intro and keep only the intro text
html = html.replace(
  /<p>A lo mejor ya leíste la <a[^>]*href="https:\/\/www\.opticabassol\.com\/blogs\/news\/gafas-pasta-metal-cuales-mejores"[^>]*>comparativa de gafas de pasta y metal<\/a>, la gente se hace bolas con los fierros, te paso las <strong>Especificaciones técnicas del modelo Shooter RB3138M:<\/strong><\/p>/,
  '<p><strong>Especificaciones técnicas del modelo Shooter RB3138M:</strong></p>'
);

// Remove orphan link + collection shortcode under Model 2
html = html.replace(
  /<p><a[^>]*href="https:\/\/www\.opticabassol\.com\/en\/collections\/sunglasses-ray-ban\?page=23"[^>]*>un montón de gafas de sol Ray-Ban<\/a><\/p>\s*<p>\{\*640121733443\*\}<\/p>/,
  ''
);

// Remove orphan link to Ray-Ban Meta + collection shortcode under Model 3
html = html.replace(
  /<p><a[^>]*href="https:\/\/www\.opticabassol\.com\/collections\/gafas-de-sol-ray-ban-meta\?page=2"[^>]*>todo lo que traen las gafas Ray-Ban Meta, que vienen con bastante tecnología<\/a><\/p>\s*<p>\{\*640121995587\*\}<\/p>/,
  ''
);

// Remove orphan link under 'Técnica de Ensamblaje y Montura Metálica al Descubierto'
html = html.replace(
  /<p><a[^>]*href="https:\/\/www\.opticabassol\.com\/blogs\/news\/gafas-pasta-metal-cuales-mejores"[^>]*>por qué es mejor usar gafas finas de metal que las de pasta de siempre<\/a><\/p>/,
  ''
);

// Integrate the pasta-vs-metal link naturally in the actual Pasta vs Metal section
html = html.replace(
  'Las gafas pesadotas hartan, se te escurren por la nariz, te agotas, el fierro manda en la comodidad.',
  'Las gafas pesadotas hartan, se te escurren por la nariz, te agotas, y al revisar <a target="_blank" rel="noopener" class="text-indigo-600 underline decoration-indigo-600/30 underline-offset-4 cursor-pointer hover:decoration-indigo-600 transition-colors" href="https://www.opticabassol.com/blogs/news/gafas-pasta-metal-cuales-mejores">cuáles son mejores entre gafas de pasta y metal</a>, el fierro manda en la comodidad.'
);

// Update the 3 Shopify product shortcodes to match the real RB3138M and RB3029M IDs
html = html.replace('[*15103412240707*]', '[*15294450008387*]');
html = html.replace('[*15103419187523*]', '[*15294449221955*]');
html = html.replace('[*15103420268867*]', '[*15294449156419*]');

// 4. Fix ALL malformed / fragmented lists
// List 1: Model 1 (Shooter RB3138M) specs (5 items currently as <p>)
html = html.replace(
  /<p><strong>Calibre:<\/strong>(.*?)<\/p>\s*<p><strong>Material del Marco:<\/strong>(.*?)<\/p>\s*<p><strong>Puente:<\/strong>(.*?)<\/p>\s*<p><strong>Lentes:<\/strong>(.*?)<\/p>\s*<p><strong>Perfil ideal:<\/strong>(.*?)<\/p>/s,
  '<ul>\n  <li><strong>Calibre:</strong>$1</li>\n  <li><strong>Material del Marco:</strong>$2</li>\n  <li><strong>Puente:</strong>$3</li>\n  <li><strong>Lentes:</strong>$4</li>\n  <li><strong>Perfil ideal:</strong>$5</li>\n</ul>'
);

// List 2: Model 3 (Outdoorsman II 54mm) specs (4 items: <p>, <p>, <ul><li>, <p>)
html = html.replace(
  /<p><strong>Material Principal:<\/strong>(.*?)<\/p>\s*<p><strong>Ergonomía Frontal:<\/strong>(.*?)<\/p>\s*<ul><li><strong>Estética Arista & Azul:<\/strong>(.*?)<\/li><\/ul>\s*<p><strong>Cristales:<\/strong>(.*?)<\/p>/s,
  '<ul>\n  <li><strong>Material Principal:</strong>$1</li>\n  <li><strong>Ergonomía Frontal:</strong>$2</li>\n  <li><strong>Estética Arista &amp; Azul:</strong>$3</li>\n  <li><strong>Cristales:</strong>$4</li>\n</ul>'
);

// List 3: Timeline (1936-1937, 1985, 2026: <ul><li>, <p>, <ul><li>)
html = html.replace(
  /<ul><li><strong>1936-1937:<\/strong>(.*?)<\/li><\/ul>\s*<p><strong>1985:<\/strong>(.*?)<\/p>\s*<ul><li><strong>2026:<\/strong>(.*?)<\/li><\/ul>/s,
  '<ul>\n  <li><strong>1936-1937:</strong>$1</li>\n  <li><strong>1985:</strong>$2</li>\n  <li><strong>2026:</strong>$3</li>\n</ul>'
);

// List 4: Shooter & Outdoorsman II comparison (<ul><li>, <p>)
html = html.replace(
  /<ul><li><strong>Modelo Shooter:<\/strong>(.*?)<\/li><\/ul>\s*<p><strong>Modelo Outdoorsman II:<\/strong>(.*?)<\/p>/s,
  '<ul>\n  <li><strong>Modelo Shooter:</strong>$1</li>\n  <li><strong>Modelo Outdoorsman II:</strong>$2</li>\n</ul>'
);

// List 5: Detalles del Puente (3 items currently as <p>)
html = html.replace(
  /<p><strong>Barra ciliar \(Sweat bar\) de nácar auténtico:<\/strong>(.*?)<\/p>\s*<p><strong>Puente doble de aleación de titanio y acero quirúrgico:<\/strong>(.*?)<\/p>\s*<p><strong>Plaquetas nasales articuladas de acetato hipoalergénico translúcido:<\/strong>(.*?)<\/p>/s,
  '<ul>\n  <li><strong>Barra ciliar (Sweat bar) de nácar auténtico:</strong>$1</li>\n  <li><strong>Puente doble de aleación de titanio y acero quirúrgico:</strong>$2</li>\n  <li><strong>Plaquetas nasales articuladas de acetato hipoalergénico translúcido:</strong>$3</li>\n</ul>'
);

// List 6: Innovación Estructural Rimless (4 items currently as <p>)
html = html.replace(
  /<p><strong>Corte exacto en el vidrio:<\/strong>(.*?)<\/p>\s*<p><strong>Hilo invisible súper resistente:<\/strong>(.*?)<\/p>\s*<p><strong>El hilo que sujeta todo:<\/strong>(.*?)<\/p>\s*<p><strong>Para que no se muevan:<\/strong>(.*?)<\/p>/s,
  '<ul>\n  <li><strong>Corte exacto en el vidrio:</strong>$1</li>\n  <li><strong>Hilo invisible súper resistente:</strong>$2</li>\n  <li><strong>El hilo que sujeta todo:</strong>$3</li>\n  <li><strong>Para que no se muevan:</strong>$4</li>\n</ul>'
);

// List 7: 3 Claves Antifraude (<ul><li>, <p>, <p>)
html = html.replace(
  /<ul><li><strong>Grabado láser de seguridad:<\/strong>(.*?)<\/li><\/ul>\s*<p><strong>Certificados de Trazabilidad y Autenticidad:<\/strong>(.*?)<\/p>\s*<p><strong>Peso y material:<\/strong>(.*?)<\/p>/s,
  '<ul>\n  <li><strong>Grabado láser de seguridad:</strong>$1</li>\n  <li><strong>Certificados de Trazabilidad y Autenticidad:</strong>$2</li>\n  <li><strong>Peso y material:</strong>$3</li>\n</ul>'
);

// List 8: Tendencias Aviator 2026 (<p>, <ul><li>, <p>)
html = html.replace(
  /<p><strong>Marcos de metal ligeros:<\/strong>(.*?)<\/p>\s*<ul><li><strong>Cristales que cambian con el clima:<\/strong>(.*?)<\/li><\/ul>\s*<p><strong>Lujo y cuidar el planeta:<\/strong>(.*?)<\/p>/s,
  '<ul>\n  <li><strong>Marcos de metal ligeros:</strong>$1</li>\n  <li><strong>Cristales que cambian con el clima:</strong>$2</li>\n  <li><strong>Lujo y cuidar el planeta:</strong>$3</li>\n</ul>'
);

// Also remove <p> tags inside <th> and <td> in tables for cleaner HTML
html = html.replace(/<(th|td)([^>]*)>\s*<p>(.*?)<\/p>\s*<\/\1>/gs, '<$1$2>$3</$1>');

fs.writeFileSync('task_final_polished_authentic.html', html, 'utf8');
console.log('Successfully updated task_final_polished_authentic.html, size:', html.length);
