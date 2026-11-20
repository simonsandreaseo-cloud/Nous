const engine = require('./electron/engine/neurosymbolic-engine.cjs');
const samples = require('./src/samples/bohoSample.js');

async function test() {
  console.log('=== TESTEANDO shortBohoArticle CON EL MOTOR 100% DINÁMICO ===\n');
  const res = await engine.humanizeArticle(samples.shortBohoArticle);
  console.log('--- RESULTADO ---');
  console.log(res.text);
  console.log('\n--- MÉTRICAS ---');
  console.log(res.metrics);
}
test();
