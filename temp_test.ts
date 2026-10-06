import { runSurgicalEditorPipeline } from './src/lib/actions/aiActions.js';

async function test() {
    const html = '<p>Gucci lanzó lentes inmensos para atraer miradas, aunque otras marcas siguen la tendencia.</p>';
    const config = {};
    try {
        const result = await runSurgicalEditorPipeline(html, config, 1);
        console.log("SUCCESS:", result.html);
    } catch (e) {
        console.error("FAILED:", e);
    }
}
test().catch(console.error);
