const path = require('path');
const ollama = require(path.resolve(__dirname, '../desktop-app/electron/engine/ollama-client.cjs'));

async function test() {
  const donor = "Otras te harán identificarte con un estilo, para desmarcarte de todo y protestar. Las puedes encontrar para la primavera, y para el verano. Las tienes para la noche y el día, para mirar fijamente, para despistar, para negociar…";
  const target = "Una relectura del universo vintage en clave moderna donde la silueta retro nos traslada a los años 70, convirtiéndose en el toque definitivo para no complicarse con la ropa.";

  const prompt = `[SISTEMA: ERES UN MOTOR NEUROSÍMBOLO DE ADAPTACIÓN SINTÁCTICA]
REGLA INMUTABLE:
1. Copia exactamente la estructura sintáctica, signos de puntuación, conjunciones y longitud de la ORACIÓN DONANTE.
2. Sustituye únicamente los sustantivos y especificaciones técnicas por las del PRODUCTO OBJETIVO.
3. PROHIBIDO generar oraciones nuevas, clichés o introducciones.

ORACIÓN DONANTE BIOLÓGICA (Humana pre-2022):
"${donor}"

PRODUCTO OBJETIVO / INFORMACIÓN:
"${target}"

SALIDA (Únicamente la oración adaptada exacta):`;

  console.log('Sending prompt to Ollama qwen2.5:1.5b...');
  const res = await ollama.generate('qwen2.5:1.5b', prompt, { temperature: 0.1, num_predict: 120 });
  console.log('Ollama Response:', JSON.stringify(res.response));
}

test();
