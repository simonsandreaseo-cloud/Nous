const fs = require('fs');

let html = fs.readFileSync('task_surgical_pass2.html', 'utf8');

// Section 1: DG1361 -> RB3138M Shooter
html = html.replace('<h3>1. Dolce&amp;Gabbana DG1361</h3>', '<h3>1. Ray-Ban x Dolce&amp;Gabbana Shooter (RB3138M)</h3>');
html = html.replace('Especificaciones técnicas del modelo DG1361:', 'Especificaciones técnicas del modelo Shooter RB3138M:');
html = html.replace('<strong>Calibre:</strong> Da 60 mm, los cristales andan grandotes', '<strong>Calibre:</strong> Da 58 mm, los cristales de gota andan en buena medida');
html = html.replace('<strong>Material del Marco:</strong> Meten fierro del montón, le ponen capita, no agarra sarro', '<strong>Material del Marco:</strong> Montura de metal dorado ligero con efecto al aire, no agarra sarro');
html = html.replace('<strong>Puente:</strong> El puente doble está macizo, trae cositas adornando', '<strong>Puente:</strong> El puente doble con orificio central para cigarro y barra de nácar está macizo');
html = html.replace('https://www.opticabassol.com/en-us/products/dolce-gabbana-dg1361-02-60', 'https://www.opticabassol.com/products/ray-ban-rb3138m-001-71-58');
html = html.replace('Consigue tus Dolce&amp;Gabbana DG1361 aquí', 'Consigue tus Ray-Ban x Dolce&amp;Gabbana Shooter RB3138M aquí');

// Section 2: DG3415 -> RB3029M Outdoorsman II (58mm)
html = html.replace('<h3>2. Dolce&amp;Gabbana DG3415</h3>', '<h3>2. Ray-Ban x Dolce&amp;Gabbana Outdoorsman II (RB3029M - 58mm)</h3>');
html = html.replace('Estas DG3415 te van a quedar a la perfecciÃ³n', 'Estas RB3029M te van a quedar a la perfección');
html = html.replace('Estas DG3415 te van a quedar a la perfección', 'Estas RB3029M te van a quedar a la perfección');
html = html.replace('<strong>Calibre 55 Equilibrado</strong>', '<strong>Calibre 58 Amplio</strong>');
html = html.replace('<strong>Bisagras de Barril Reforzadas</strong>', '<strong>Barra Superior y Montura Arista</strong>');
html = html.replace('<strong>Perfil Lateral Esculpido</strong>', '<strong>Lentes Azul Espejado</strong>');
html = html.replace('<strong>Acabado Premium</strong>', '<strong>Efecto Rimless Flotante</strong>');
html = html.replace('https://www.opticabassol.com/en-us/products/dolce-gabbana-dg3415-2525-55', 'https://www.opticabassol.com/products/ray-ban-rb3029m-001-55-58');
html = html.replace('Mira estas gafas, entra al link y llévate las Dolce&amp;Gabbana DG3415 de una vez, para qué pensarlo tanto', 'Mira estas gafas, entra al link y llévate las Ray-Ban x Dolce&amp;Gabbana RB3029M de 58mm de una vez, para qué pensarlo tanto');

// Section 3: DG3419 -> RB3029M Outdoorsman II (54mm)
html = html.replace('<h3>3. Dolce&amp;Gabbana DG3419</h3>', '<h3>3. Ray-Ban x Dolce&amp;Gabbana Outdoorsman II (RB3029M - 54mm)</h3>');
html = html.replace('Pélale los ojos a los datos del modelo DG3419 (501-52) por acá abajo:', 'Pélale los ojos a los datos del modelo RB3029M (001/55 - 54mm) por acá abajo:');
html = html.replace('<strong>Material Principal:</strong> Agarraron acetato de celulosa machín, es un puro cacho, el color no despinta', '<strong>Material Principal:</strong> Estructura de metal dorado con barra superior distintiva, el color no despinta');
html = html.replace('<strong>Ergonomía Frontal:</strong> El lente cae en la narizona, no te saca ronchas, se agotaron esos plásticos feos, las gomas daban mucha comezón. El peso se reparte, te echas horas en la computadora, ni en cuenta, le tomaba al café, se me olvidó quitármelos.', '<strong>Ergonomía Frontal:</strong> La montura metálica cae suave en la narizona, no te saca marcas, el peso se reparte parejito, te echas horas bajo el sol, ni en cuenta, le tomaba al café, se me olvidó quitármelos.');
html = html.replace('<strong>Estética 501:</strong> El negrito jala con lo que caiga, andas de catrín, vas en chanclas, las patas apestan a veces. Lo oscurito tapa la tierra, pasas volando, ni le echas un trapazo, andas en el desmadre, nadie te dice nada.', '<strong>Estética Arista & Azul:</strong> El marco dorado con cristal azul jala con lo que caiga, andas de catrín, vas en chanclas, el tono espejado luce impecable en la calle, nadie te dice nada.');
html = html.replace('<strong>Cristales:</strong> Los cristales son fuertes, aguantan golpecillos, le bajan a la luz fuerte de los focos, el patrón echa bronca. Te vas a dar una vuelta, los ojos relax, ni sientes que las traes, los pies se hinchan.', '<strong>Cristales:</strong> Los cristales de gota son fuertes, aguantan golpecillos, le bajan al resplandor del sol bravo en la calle. Te vas a dar una vuelta, los ojos relax, ni sientes que las traes, los pies se hinchan.');
html = html.replace('https://www.opticabassol.com/en-us/products/dolce-gabbana-dg3419-501-52', 'https://www.opticabassol.com/products/ray-ban-rb3029m-001-55-53');
html = html.replace('Haz clic aquí para ver los Dolce&amp;Gabbana DG3419', 'Haz clic aquí para ver los Ray-Ban x Dolce&amp;Gabbana RB3029M de 54mm');

fs.writeFileSync('task_final_fixed.html', html, 'utf8');
console.log('Successfully saved task_final_fixed.html');
