const fs = require('fs');
const cheerio = require('cheerio');

const filepath = 'C:/Users/Simon Sandrea/.gemini/antigravity/brain/d9f18309-438a-45c6-a0d9-69d2a5ce0ece/.system_generated/steps/26/output.txt';
const data = fs.readFileSync(filepath, 'utf-8');

try {
    const parsedFile = JSON.parse(data);
    const resultStr = parsedFile.result;
    
    const arrayStart = resultStr.indexOf('[');
    const arrayEnd = resultStr.lastIndexOf(']');
    const tasksJson = resultStr.substring(arrayStart, arrayEnd + 1);
    
    const tasks = JSON.parse(tasksJson);
    const task = tasks[0];
    
    let rawHtml = task.content_body;
    
    let preCleaned = rawHtml.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');
    const $ = cheerio.load(preCleaned, null, false);
    $('script, style, pre, code, iframe').remove();
    
    const aiGarbageRegex = /(?:Deterministic Transformer|Expert HTML|Focus:|Expansion:|Drafting:|Minimum \d+ words|1500\+ words|HTML direct|semantic tags|H\d:|Direct answer|Professional, SEO|No markdown|In this article|Concluding|Check word count|Word count strategy|Internal link|Constraint Check|Self-Correction|JSON metadata|Direct response|Prompt:|Table for comparison|Comparative Table|Blockquote for|ESTRATEGIA DE ENLAZADO INTERNO|Wait, |I will |I'll |I must |list provided|omit links|create generic|Section \d+|tags\.|must check if I missed|only body content|No generic intro|use placeholders|hallucinating URLs|none were given|Focus on the|MUST appear)/i;
    
    $.root().contents().filter((_, el) => el.type === 'text').remove();
    
    $('ul, ol, table, tbody, thead, tfoot, tr').contents().filter((_, el) => {
        return el.type === 'text' && $(el).text().trim().length > 0;
    }).remove();
    
    let removedCount = 0;
    $('p, h1, h2, h3, h4, h5, h6, li, blockquote, ul, ol, div, span, strong').each((_, el) => {
        const text = $(el).text();
        if (aiGarbageRegex.test(text) || text.includes('**') || text.includes('##') || text.includes('</h1><h2>') || text.includes('</h2><h3>') || text.includes('`')) {
            $(el).remove();
            removedCount++;
        }
    });
    console.log(`Removed ${removedCount} elements via garbage regex.`);
    
    let outputHtml = $.html();
    outputHtml = outputHtml.replace(/```html/gi, '').replace(/```/g, '');
    
    console.log(`Cleaned length: ${outputHtml.length}`);
    fs.writeFileSync('clean_output.html', outputHtml);
    
} catch (e) {
    console.error('Error:', e);
}
