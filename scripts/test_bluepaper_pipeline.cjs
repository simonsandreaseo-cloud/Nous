const fs = require('fs');
const path = require('path');
const ollama = require('../desktop-app/electron/engine/ollama-client.cjs');

// Load bank
const baseDir = path.resolve(__dirname, '../banco_ontologico_semantico');
const masterBricks = JSON.parse(fs.readFileSync(path.join(baseDir, 'banco_maestro_ladrillos_retoricos.json'), 'utf8'));

console.log('Total Master Bricks loaded:', masterBricks.length);

// Sample input AI paragraph (from Boho Chic draft)
const sampleAiPara = "Las gafas de sol se han erigido en un accesorio clave a la hora de pasear o recorrer la ciudad. Son esenciales para resguardarnos del resplandor de los rayos solares y el detalle idóneo para nuestro estilo boho chic; hoy en día encontramos muchas formas, acabados y colores, pero hay modelos emblemáticos que han pervivido a lo largo de las décadas. Una relectura del universo vintage en clave moderna donde la silueta retro nos traslada a los años 70, convirtiéndose en el toque definitivo para no complicarse con la ropa.";

async function runBluepaperPipelineTest() {
  console.log('\n=== FASE 1: ATOMIZACIÓN FÁCTICA PURA (Semántica de Davidson) ===');
  // Extract propositional facts from the AI paragraph, completely discarding AI syntax
  const atomizePrompt = `[SISTEMA: EXTRACTOR PROPOSICIONAL DE DAVIDSON]
Descompón el siguiente texto sintético en sus ÁTOMOS FÁCTICOS PUROS (hechos, entidades, propiedades y relaciones).
Descarta por completo la sintaxis de IA, conectores de relleno y orden original.

TEXTO DE ENTRADA:
"${sampleAiPara}"

SALIDA EN FORMATO LISTA DE HECHOS:
- Hecho 1:
- Hecho 2:
- Hecho 3:`;

  const t0 = Date.now();
  console.log('Ejecutando Fase 1 con Qwen 2.5...');
  const resAtoms = await ollama.generate('qwen2.5:1.5b', atomizePrompt, { temperature: 0.1, num_predict: 150 });
  const extractedFacts = resAtoms.response.trim();
  console.log('Átomos Fácticos Extraídos (Took ' + (Date.now() - t0) + 'ms):\n' + extractedFacts);

  console.log('\n=== FASE 2: ONTOLOGÍA DE DONANTES & MAPEO DE RANURAS ===');
  // Match the thematic frame: style & vintage eyewear
  const candidateDonors = masterBricks.filter(b => 
    (b.frame === 'GENERAL_STYLE' || b.frame === 'VISAGISM_AESTHETICS') &&
    (b.voice_category === 'EDITORIAL_LIFESTYLE' || b.tier === 'TIER_1_WORKSHOP') &&
    b.slots_count >= 1 &&
    b.raw_text.length >= 80 && b.raw_text.length <= 300
  );
  console.log(`Donantes compatibles en marco GENERAL_STYLE/VISAGISM: ${candidateDonors.length}`);
  
  const chosenDonor = candidateDonors[5]; // Pick a high-quality biological donor
  console.log('Donante Biológico Pre-2022 Seleccionado:');
  console.log('ID:', chosenDonor.brick_id);
  console.log('Esqueleto Sintáctico:', chosenDonor.syntactic_skeleton);
  console.log('Texto Original Humano:', chosenDonor.raw_text);
  console.log('Ranuras:', JSON.stringify(chosenDonor.slots, null, 2));

  console.log('\n=== FASE 3: CENTERING TRANSITION & PRO-DROP HEALING ===');
  let centeringContext = `Entidad principal de enfoque: Gafas de sol de estilo boho chic / retro años 70.`;
  if (chosenDonor.centering_signature && chosenDonor.centering_signature.has_pro_drop_subject) {
    centeringContext += ` NOTA: El sujeto del donante está elidido. Debes instanciar explícitamente el sujeto ("Estas monturas", "Las gafas de sol") para evitar colisión anafórica.`;
  }
  console.log('Contexto de Centrado:', centeringContext);

  console.log('\n=== FASE 4: MICRO-LLM COLOCACIONAL (QWEN 2.5) ===');
  const compilePrompt = `[SISTEMA: COMPILADOR NEUROSÍMBOLO DE COLOCACIÓN Y CONCORDANCIA]
REGLA INMUTABLE:
1. Copia con total fidelidad el esqueleto sintáctico, puntuación y cadencia del DONANTE BIOLÓGICO HUMANO PRE-2022.
2. Inyecta los ÁTOMOS FÁCTICOS en las ranuras correspondientes, respetando estricta concordancia de género, número y naturalidad idiomática española.
3. Prohibido añadir introducciones, conclusiones o generar sintaxis nueva de ChatGPT.

DONANTE HUMANO PRE-2022 (Esqueleto sintáctico):
"${chosenDonor.syntactic_skeleton}"

HECHOS A INYECTAR:
${extractedFacts}

${centeringContext}

TEXTO COMPILADO (Únicamente la versión final reconstruida):`;

  const t1 = Date.now();
  console.log('Compilando con Qwen 2.5...');
  const resCompiled = await ollama.generate('qwen2.5:1.5b', compilePrompt, { temperature: 0.1, num_predict: 200 });
  const compiledText = resCompiled.response.trim().replace(/^["']|["']$/g, '');
  console.log('Texto Compilado (Took ' + (Date.now() - t1) + 'ms):\n' + compiledText);

  console.log('\n=== FASE 5: OPERADOR SIMBÓLICO ANTI-PLAGIO & CONTROL MÉTRICO ===');
  // Check shingles against donor
  const donorWords = chosenDonor.raw_text.toLowerCase().split(/\s+/);
  const compiledWords = compiledText.toLowerCase().split(/\s+/);
  let shingleMatches = 0;
  for (let i = 0; i <= compiledWords.length - 7; i++) {
    const s7 = compiledWords.slice(i, i + 7).join(' ');
    if (chosenDonor.raw_text.toLowerCase().includes(s7)) shingleMatches++;
  }
  console.log('Coincidencias 7-gram con el donante:', shingleMatches, '(Objetivo: 0)');
  console.log('Palabras:', compiledWords.length);
}

runBluepaperPipelineTest();
