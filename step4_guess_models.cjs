const fs = require('fs');

let html = fs.readFileSync('guess_latest.html', 'utf8');

// --- FASE 4: AJUSTE QUIRÚRGICO DE MODELOS Y DESCRIPCIONES ---

// 1. Modelo 1: Guess GU00158 -> Guess GU00260 (Ref: square_01 / heart_03 - Redondo de metal ligero para rostro cuadrado)
html = html.replace('<h3>1. Guess GU00158</h3>', '<h3>1. Guess GU00260</h3>');
html = html.replace(
  'A lo mejor también te preguntas <strong>¿son adecuadas las gafas de sol de aviador para rasgos faciales simétricos?</strong>. Ese estilo aviador favorece a las rostros simétricos',
  'A lo mejor también te preguntas <strong>¿son adecuadas las gafas de sol metálicas para rasgos faciales simétricos?</strong>. Ese estilo redondeado favorece a los rostros simétricos'
);
html = html.replace(
  'href="https://www.opticabassol.com/en/products/guess-gu00158-32b-61">Comprar Guess GU00158</a>',
  'href="https://www.opticabassol.com/products/guess-gu00260-28b-56">Comprar Guess GU00260</a>'
);
html = html.replace('[*14720454885699*]', '[*15058402935107*]');

// 2. Modelo 2: Guess GU00261 H -> Guess GU00257 (Ref: round_01 - Cuadrado de acetato grueso para rostro redondo)
html = html.replace('<h3>2. Guess GU00261 H</h3>', '<h3>2. Guess GU00257</h3>');
html = html.replace('estas esquinas tan cuadradas tapan estilizan el rostro.', 'estas esquinas tan cuadradas estilizan el rostro.');
html = html.replace(
  'href="https://www.opticabassol.com/en-gr/products/guess-gu00261-h-01a-52">Comprar Guess GU00261 H</a>',
  'href="https://www.opticabassol.com/products/guess-gu00257-52f-57">Comprar Guess GU00257</a>'
);
html = html.replace('[*15058404671811*]', '[*15058406867267*]');

// 3. Modelo 3: Guess GU00289 -> Guess GU00255 (Ref: oval_01 / square_04 - Cat Eye acetato negro para rostro ovalado y corazón)
html = html.replace('<h3>3. Guess GU00289</h3>', '<h3>3. Guess GU00255</h3>');
html = html.replace(
  'href="https://www.opticabassol.com/en-hr/products/guess-gu00289-32a-56">Comprar Guess GU00289</a>',
  'href="https://www.opticabassol.com/products/guess-gu00255-01b-53">Comprar Guess GU00255</a>'
);
html = html.replace('[*15224952521027*]', '[*15058404049219*]');

// 4. En el cuerpo del artículo (sección rostro corazón), limpiar el código interno GU025553QQQ-01B y nombre en inglés
html = html.replace(
  'el modelo Cat Eye Sunglasses Black (GU025553QQQ-01B) me encanta',
  'el modelo Cat Eye negro (Guess GU00255) me encanta'
);

fs.writeFileSync('guess_step4_models.html', html, 'utf8');
console.log('Fase 4 completada. Guardado en guess_step4_models.html (longitud:', html.length, ')');
