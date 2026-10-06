const fs = require('fs');

const baseText = fs.readFileSync('persol_base.html', 'utf-8');

// Pass 1
let pass1 = baseText
  .replace('la gente las busca un montón', 'son sumamente demandadas')
  .replace('tienen esa pinta de aviador', 'lucen un estilo de aviador')
  .replace('te tapan toda la vista del sol', 'cubren completamente el campo visual')
  .replace('ataja el 100%', 'bloquea el 100%')
  .replace('el sol quema fuerte', 'la exposición solar es intensa')
  .replace('no te lastima la vista', 'protege tu salud visual')
  .replace('hay fanáticos que las guardan', 'existen coleccionistas que las conservan')
  .replace('copiaron el modelo exacto', 'replicaron el diseño exacto')
  .replace('andaba de vacaciones', 'disfrutaba de su tiempo libre');

fs.writeFileSync('persol_surg1.html', pass1, 'utf-8');

// Pass 2
let pass2 = pass1
  .replace('la gente del taller lo moldea', 'los artesanos lo moldean')
  .replace('para que veas todo súper nítido', 'para garantizar una visión impecable')
  .replace('corta los reflejos que te molestan', 'elimina los reflejos molestos')
  .replace('ocupan tanta cara', 'cubren tanto el rostro')
  .replace('te endurece bastante la expresión', 'marca fuertemente los rasgos')
  .replace('salen muchísimo en las ópticas', 'son un éxito de ventas')
  .replace('compiten cabeza a cabeza', 'rivalizan directamente')
  .replace('le sientan bárbaro', 'favorecen especialmente')
  .replace('sirven un montón para caminar', 'son ideales para transitar')
  .replace('apagan el reflejo molesto', 'neutralizan los reflejos molestos');

fs.writeFileSync('persol_surg2.html', pass2, 'utf-8');

// Pass 3
let pass3 = pass2
  .replace('se pongan negros', 'se oscurezcan por completo')
  .replace('te quitan casi todo el brillo', 'reducen significativamente el resplandor')
  .replace('te mueve la aguja del precio', 'modifica la inversión final')
  .replace('lleva otro proceso en el taller', 'requiere un proceso adicional')
  .replace('no se raya fácil', 'ofrece gran resistencia a los arañazos')
  .replace('hacer sombras raras', 'generar distorsiones visuales')
  .replace('te da picazón en la nariz', 'provoca irritaciones en la piel')
  .replace('hacen agua en esos detalles', 'fallan en estos acabados')
  .replace('no hacen ese ruidito feo', 'evitan ruidos por fricción')
  .replace('ni quede colgando en el aire ni chueca', 'ni quede suspendida en el aire ni desalineada');

fs.writeFileSync('persol_surg3.html', pass3, 'utf-8');

console.log('Success');
