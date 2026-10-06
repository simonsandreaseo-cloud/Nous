const fs = require('fs');
const path = require('path');
const { wordLevenshtein, check } = require('./test_helper.cjs');

const baseContent = fs.readFileSync(path.join(__dirname, 'latest_base.html'), 'utf8');
const lines = baseContent.split('\n');

function evalSub(lineIndex, origText, target, repl) {
    if (!origText.includes(target)) {
        return { ok: false, error: `Target "${target}" not found in line ${lineIndex + 1}` };
    }
    const newText = origText.replace(target, repl);
    const origClean = origText.replace(/<[^>]+>/g, '').trim();
    const newClean = newText.replace(/<[^>]+>/g, '').trim();
    const res = check(origClean, newClean);
    return { ok: res.ok, res, newText };
}

// Let's test single-word or tight 2-word upgrades for every paragraph!
const pass1Candidates = [
    // Line 2 (36w): "Comprar" -> "Adquirir" (dist 1)
    { line: 2, target: "Comprar unas gafas ZEGNA", repl: "Adquirir unas gafas ZEGNA" },
    // Line 5 (72w): "nada más mirarlos." -> "a simple vista." (dist 2)
    { line: 5, target: "nada más mirarlos.", repl: "a simple vista." },
    // Line 6 (81w): "armar la lista" -> "elaborar la lista" (dist 1)
    { line: 6, target: "para armar la lista,", repl: "para elaborar la lista," },
    // Line 9 (67w): "empezar," -> "iniciarse," (dist 1)
    { line: 9, target: "ideal para empezar,", repl: "ideal para iniciarse," },
    // Line 10 (48w): "manejas" -> "conduces" (dist 1)
    { line: 10, target: "si manejas varias horas,", repl: "si conduces varias horas," },
    // Line 14 (55w): "liviano" -> "ligero" (dist 1)
    { line: 14, target: "metal liviano", repl: "metal ligero" },
    // Line 15 (54w): "aguanta" -> "resiste" (dist 1)
    { line: 15, target: "El material aguanta el día a día,", repl: "El material resiste el día a día," },
    // Line 19 (63w): "bien geométrico" -> "marcadamente geométrico" (dist 1)
    { line: 19, target: "un diseño bien geométrico", repl: "un diseño marcadamente geométrico" },
    // Line 20 (69w): "de más," -> "en exceso," (dist 1)
    { line: 20, target: "llamar la atención de más,", repl: "llamar la atención en exceso," },
    // Line 24 (56w): "taparse" -> "protegerse" (dist 1)
    { line: 24, target: "para taparse del sol,", repl: "para protegerse del sol," },
    // Line 25 (80w): "todo se ve limpio." -> "todo luce impecable." (dist 2)
    { line: 25, target: "todo se ve limpio.", repl: "todo luce impecable." },
    // Line 28 (83w): "le da justo al punto," -> "acierta con precisión," (dist 2)
    { line: 28, target: "le da justo al punto,", repl: "acierta con precisión," },
    // Line 29 (69w): "relojes caros" -> "relojes de alta gama" (dist 2)
    { line: 29, target: "relojes caros", repl: "relojes de alta gama" },
    // Line 32 (48w): "un adorno cualquiera," -> "un detalle meramente accesorio," (dist 2)
    { line: 32, target: "un adorno cualquiera,", repl: "un adorno cualquiera," }, // test below
    // Line 33 (90w): "hizo Ermenegildo" -> "construyó Ermenegildo" (dist 1)
    { line: 33, target: "que hizo Ermenegildo Zegna", repl: "que construyó Ermenegildo Zegna" },
    // Line 36 (80w): "buscan una ligereza notable" (dist 2)
    { line: 36, target: "buscan que no pesen casi nada", repl: "buscan que apenas tengan peso" }
];

// Let's run a test loop across each line
console.log('Testing candidates on lines...');
let allOk = true;
pass1Candidates.forEach(cand => {
    const orig = lines[cand.line - 1];
    const r = evalSub(cand.line - 1, orig, cand.target, cand.repl);
    if (!r.ok) {
        console.log(`FAIL Line ${cand.line}:`, r.error || `${r.res.pct}% > 5% (dist ${r.res.dist}/${r.res.words})`);
        allOk = false;
    } else {
        console.log(`OK Line ${cand.line}: dist=${r.res.dist}/${r.res.words} (${r.res.pct}%)`);
    }
});
