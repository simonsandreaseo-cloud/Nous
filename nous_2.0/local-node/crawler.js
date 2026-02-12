const puppeteer = require('puppeteer-core');
const chromeLauncher = require('chrome-launcher');

async function run() {
    // 1. Parse Input
    const inputArg = process.argv[process.argv.length - 1];
    let input = {};
    try {
        input = JSON.parse(inputArg);
    } catch (e) {
        console.error(JSON.stringify({ error: "Invalid JSON input", received: inputArg }));
        process.exit(1);
    }

    const { url, keyword, mode = 'search' } = input;

    // 2. Locate Chrome
    const chromePath = chromeLauncher.Launcher.getFirstInstallation();
    if (!chromePath) {
        console.error(JSON.stringify({ error: "Chrome not found on system" }));
        process.exit(1);
    }

    // 3. Launch Browser
    const browser = await puppeteer.launch({
        executablePath: chromePath,
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        if (mode === 'search' && keyword) {
            // GOOGLE SEARCH MODE
            await page.goto(`https://www.google.com/search?q=${encodeURIComponent(keyword)}&num=10`, { waitUntil: 'networkidle2' });

            const results = await page.evaluate(() => {
                const items = [];
                document.querySelectorAll('div.g').forEach((el) => {
                    const title = el.querySelector('h3')?.innerText;
                    const link = el.querySelector('a')?.href;
                    const snippet = el.querySelector('div.VwiC3b')?.innerText;
                    if (title && link) items.push({ title, link, snippet });
                });
                return items;
            });

            console.log(JSON.stringify({ success: true, data: results }));
        } else if (mode === 'scrape' && url) {
            // SINGLE PAGE SCRAPE MODE
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

            const content = await page.evaluate(() => {
                return {
                    title: document.title,
                    h1: Array.from(document.querySelectorAll('h1')).map(h => h.innerText),
                    text: document.body.innerText.substring(0, 10000) // First 10k chars
                };
            });

            console.log(JSON.stringify({ success: true, data: content }));
        } else {
            console.log(JSON.stringify({ error: "Missing keyword or url for selected mode" }));
        }

    } catch (error) {
        console.error(JSON.stringify({ error: error.message }));
    } finally {
        await browser.close();
    }
}

run();
