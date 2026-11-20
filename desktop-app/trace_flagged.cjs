const fs = require('fs');
const path = require('path');

const run = JSON.parse(fs.readFileSync(path.join(__dirname, 'electron', 'logs', 'runs', 'run_1794071717271.json'), 'utf8'));
const masterBank = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'banco_maestro_retorico_unificado.json'), 'utf8'));

// Build donor map
const donors = [];
for (const k of ['triads', 'duos', 'singles']) {
  if (masterBank[k]) {
    for (const item of masterBank[k]) {
      if (item.text) donors.push(item);
    }
  }
}

console.log(`Total bank donors: ${donors.length}`);

// Sentences to trace
const flaggedSentences = [
  "Si hablamos de las ventajas de las gafas de metal dorado, no podemos olvidar que estas gafas cuentan con un marco grueso que recubre y protege los cristales",
  "Lo que hace la gafa oscura es disminuir el porcentaje de luz visible que llega a nuestros ojos",
  "Actualmente las patillas llevan un refuerzo metálico interno que les permite ajustar, tanto su longitud como su curvatura",
  "Por ello, es importante que entiendas que no es necesario dejarse llevar por la moda. Lo importante es que cada uno esté a gusto",
  "Para un rostro alargado donde las proporciones son muy lineales, las formas ascendentes compensan esta igualdad",
  "En los años sesenta empezaron a producir gafas protectoras para el trabajo, naciendo así el modelo Labor",
  "Barra ciliar (Sweat bar) de nácar auténtico",
  "Corte exacto en el vidrio: Una máquina talla un canal a los costados del cristal",
  "Por ello, es importante conocer también qué tipo de gafas nos podemos hallar cuando acudamos a la óptica",
  "Si tu pelo es marrón oscuro o marrón claro, te sentarán perfectamente los colores cálidos"
];

flaggedSentences.forEach((phrase, idx) => {
  console.log(`\n================ SEARCH ${idx + 1}: "${phrase.slice(0, 50)}..." ================`);
  // Find in master bank
  const pLower = phrase.toLowerCase().replace(/[^\wáéíóúüñ\s]/g, ' ');
  const words = pLower.split(/\s+/).filter(w => w.length > 4);
  
  // Look for donor with highest word overlap
  let bestDonor = null;
  let maxMatches = 0;
  for (const d of donors) {
    const dLower = d.text.toLowerCase();
    let matches = 0;
    for (const w of words) {
      if (dLower.includes(w)) matches++;
    }
    if (matches > maxMatches) {
      maxMatches = matches;
      bestDonor = d;
    }
  }

  if (bestDonor && maxMatches >= 3) {
    console.log(`FOUND DONOR (overlap ${maxMatches}/${words.length} keywords):`);
    console.log(`ID: ${bestDonor.id}, Domain: ${bestDonor.source_domain}, Tier: ${bestDonor.tier}`);
    console.log(`Donor text: "${bestDonor.text}"`);
  } else {
    console.log('NO DIRECT DONOR FOUND IN MASTER BANK (Possibly synthetic or pure target text!)');
  }
});
