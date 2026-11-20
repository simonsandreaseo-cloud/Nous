const ollama = require('../desktop-app/electron/features/local-llm-ollama/ollama-local-client.cjs');

async function testPureReconstruction() {
  const donorSkeleton = "Las [SLOT_COMPONENT] de silueta [SLOT_FRAME_SHAPE] tienen ese toque [SLOT_AESTHETIC_STYLE] que, combinado con [SLOT_OCCASION_OUTFIT], añade un aire fresco a cualquier conjunto.";
  
  const facts = {
    producto: "Chloé CH0105S 006 55",
    forma: "montura redonda",
    estilo: "vintage boho chic",
    material_acabado: "acabados artesanales suaves",
    combinacion: "vestidos sueltos y prendas de lino fresco"
  };

  const prompt = `[SISTEMA: COMPILADOR NEUROSÍMBOLO DE RECONSTRUCCIÓN FÁCTICA]
Tu tarea es compilar una oración para un artículo de moda óptica.

REGLAS MATEMÁTICAS INVIOLABLES:
1. Copia exactamente la estructura gramatical, pausas y orden del ESQUELETO HUMANO PRE-2022.
2. Utiliza ÚNICAMENTE la información fáctica provista en los HECHOS DEL PRODUCTO.
3. PROHIBIDO inventar información, personajes ajenos o usar clichés de ChatGPT (como "un papel fundamental", "un equilibrio perfecto").
4. Asegura perfecta concordancia de género y número en español.

ESQUELETO HUMANO PRE-2022:
"${donorSkeleton}"

HECHOS DEL PRODUCTO:
- Producto: ${facts.producto}
- Forma/Montura: ${facts.forma}
- Estilo: ${facts.estilo}
- Acabados: ${facts.material_acabado}
- Combinación: ${facts.combinacion}

SALIDA (Únicamente la oración final reconstruida):`;

  console.log('Enviando prompt de reconstrucción pura a Qwen 2.5...');
  const t0 = Date.now();
  const res = await ollama.generate('qwen2.5:1.5b', prompt, { temperature: 0.1, num_predict: 80 });
  console.log('Tiempo:', Date.now() - t0, 'ms');
  console.log('Resultado:\n', res.response.trim().replace(/^["']|["']$/g, ''));
}

testPureReconstruction();
