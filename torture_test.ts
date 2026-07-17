
import { HtmlProtectionService, sizeAwareChunkHtml } from './src/lib/utils/html-protection';

function assert(condition: boolean, message: string) {
    if (!condition) {
        throw new Error(`Assertion Failed: ${message}`);
    }
}

async function runTests() {
    console.log('🚀 Starting Torture Tests for Table Protection System\n');

    // --- Scenario A: The Behemoth Table ---
    console.log('Scenario A: The Behemoth Table');
    const behemothTable = '<table>' + '<tr><td>Data</td></tr>'.repeat(1000) + '</table>';
    const maxCharsA = 1000;
    const resultA = HtmlProtectionService.protect(behemothTable);
    const chunksA = sizeAwareChunkHtml(resultA.blindedHtml, maxCharsA);
    const reassembledA = chunksA.flat().join('');
    const restoredA = HtmlProtectionService.restore(reassembledA, resultA.map);
    
    assert(restoredA === behemothTable, 'Behemoth table restoration failed');
    assert(resultA.blindedHtml.includes('[[ATOMIC_BLOCK_0]]'), 'Behemoth table not tokenized');
    console.log('✅ Scenario A Passed\n');

    // --- Scenario B: The Table Minefield ---
    console.log('Scenario B: The Table Minefield');
    const minefieldHtml = '<div>' + 
        Array.from({ length: 15 }, (_, i) => `<p>Text ${i}</p><table><tr><td>Table ${i}</td></tr>${'<tr><td>More</td></tr>'.repeat(i)}</table>`).join('') + 
        '</div>';
    const resultB = HtmlProtectionService.protect(minefieldHtml);
    const chunksB = sizeAwareChunkHtml(resultB.blindedHtml, 500);
    const reassembledB = chunksB.flat().join('');
    const restoredB = HtmlProtectionService.restore(reassembledB, resultB.map);

    assert(restoredB === minefieldHtml, 'Minefield restoration failed');
    assert(resultB.map.size === 15, `Expected 15 tokens, found ${resultB.map.size}`);
    console.log('✅ Scenario B Passed\n');

    // --- Scenario C: The Broken Table ---
    console.log('Scenario C: The Broken Table');
    const brokenHtml1 = '<div><table class="broken"><tr><td>Content</td></tr></div>'; // missing </table>
    const brokenHtml2 = '<div><table></table></div>'; // empty
    
    try {
        const resultC1 = HtmlProtectionService.protect(brokenHtml1);
        // Should not tokenize if </table> is missing because regex is <table\b[^>]*>[\s\S]*?<\/table>
        // This is a design decision. If it doesn't match, it doesn't protect.
        
        const resultC2 = HtmlProtectionService.protect(brokenHtml2);
        const restoredC2 = HtmlProtectionService.restore(resultC2.blindedHtml, resultC2.map);
        assert(restoredC2 === brokenHtml2, 'Empty table restoration failed');
    } catch (e: any) {
        throw new Error(`Scenario C crashed: ${e.message}`);
    }
    console.log('✅ Scenario C Passed (Graceful handling)\n');

    // --- Scenario D: The Boundary Table ---
    console.log('Scenario D: The Boundary Table');
    const boundaryText = 'a'.repeat(990); // maxChars = 1000
    const boundaryHtml = boundaryText + '<table><tr><td>Table</td></tr></table>';
    const maxCharsD = 1000;
    
    const resultD = HtmlProtectionService.protect(boundaryHtml);
    const chunksD = sizeAwareChunkHtml(resultD.blindedHtml, maxCharsD);
    
    // Token is [[ATOMIC_BLOCK_0]], length 17.
    // boundaryText (990) + token (17) = 1007 > 1000.
    // It should be in the second chunk.
    assert(chunksD.length === 2, `Expected 2 chunks, found ${chunksD.length}`);
    assert(chunksD[0].join('').length === 990, `First chunk should be exactly 990, found ${chunksD[0].join('').length}`);
    assert(chunksD[1].join('').includes('[[ATOMIC_BLOCK_0]]'), 'Token should be in the second chunk');
    console.log('✅ Scenario D Passed\n');

    // --- Scenario E: The AI "Hallucinator" ---
    console.log('Scenario E: The AI "Hallucinator"');
    const htmlE = '<p>Hello</p><table><tr><td>Data</td></tr></table><p>World</p>';
    const resultE = HtmlProtectionService.protect(htmlE);
    let blinded = resultE.blindedHtml; // '<p>Hello</p>[[ATOMIC_BLOCK_0]]<p>World</p>'
    
    // Simulate AI adding a space: [[ ATOMIC_BLOCK_0 ]]
    const hallucinated = blinded.replace('[[ATOMIC_BLOCK_0]]', '[[ ATOMIC_BLOCK_0 ]]');
    const restoredE = HtmlProtectionService.restore(hallucinated, resultE.map);
    
    // The current implementation uses split(token).join(original). 
    // If token is '[[ATOMIC_BLOCK_0]]' and text is '[[ ATOMIC_BLOCK_0 ]]', it won't match.
    assert(restoredE !== htmlE, 'Restoration should fail if token is modified (this is the current expected behavior)');
    assert(restoredE === hallucinated, 'Restore should return the modified text as is without crashing');
    console.log('✅ Scenario E Passed (Verified robustness/limitations)\n');

    console.log('🎉 ALL TORTURE TESTS PASSED');
}

runTests().catch(err => {
    console.error('❌ TEST FAILED:');
    console.error(err);
    process.exit(1);
});
