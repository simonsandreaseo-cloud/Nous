const fs = require('fs');
const cheerio = require('cheerio');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Cargar variables de entorno si es necesario o hardcodear el API Key
const apiKey = process.env.GEMINI_API_KEY || 'MOCK_KEY'; // Necesito el API key real!
const genAI = new GoogleGenerativeAI(apiKey);

async function processHtml() {
  const html = fs.readFileSync('task_to_humanize.html', 'utf8');
  const $ = cheerio.load(html, { decodeEntities: false }, false);
  const textBlocks = {};
  let counter = 0;

  const blockSelectors = 'p, h1, h2, h3, h4, h5, h6, blockquote, q, cite, li, td, th';
  $(blockSelectors).each((_, el) => {
      if ($(el).children(blockSelectors).length === 0) {
          const innerHtml = $(el).html()?.trim();
          if (innerHtml && innerHtml.replace(/<[^>]*>/g, '').trim().length > 5) {
              const id = `block_${counter++}`;
              textBlocks[id] = innerHtml;
              $(el).attr('data-humanize-id', id);
          }
      }
  });

  const entries = Object.entries(textBlocks);
  console.log(`Extraídos ${entries.length} bloques.`);
  
  // Guardar bloques para inspeccionar
  fs.writeFileSync('blocks.json', JSON.stringify(textBlocks, null, 2));
}

processHtml();
