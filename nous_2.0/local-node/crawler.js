const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const ChromeLauncher = require('chrome-launcher');
const fs = require('fs');
const bypass = require('./bypass');

// Add stealth plugin
puppeteer.use(StealthPlugin());

async function getChromePath() {
    try {
        const installations = ChromeLauncher.Launcher.getInstallations();
        if (installations.length > 0) {
            return installations[0];
        }
    } catch (e) {
        // Fallback for Windows if chrome-launcher fails
        const commonPaths = [
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
        ];
        for (const p of commonPaths) {
            if (fs.existsSync(p)) return p;
        }
    }
    return null;
}

(async () => {
    try {
        // 1. Parse Input
        const args = process.argv[2];
        if (!args) {
            throw new Error("No options provided. Usage: node crawler.js '{\"url\": \"...\"}'");
        }
        const options = JSON.parse(args);
        const { url, id } = options;

        if (!url) throw new Error("URL is required");

        // 2. Launch Browser
        const executablePath = await getChromePath();
        if (!executablePath) {
            throw new Error("Chrome installation not found. Please install Chrome.");
        }

        const browser = await puppeteer.launch({
            executablePath,
            headless: "new",
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--window-size=1920,1080'
            ]
        });

        const page = await browser.newPage();

        // 3. Configure Dynamic Profile (Bypass)
        const profile = bypass.getRandomProfile();
        await page.setUserAgent(profile.ua);
        await page.setViewport(profile.vp);

        // 4. Navigate
        const startTime = Date.now();
        const response = await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        const endTime = Date.now();
        const status = response ? response.status() : 0;

        // 5. Extract Data
        const data = await page.evaluate(() => {
            const isGoogle = window.location.hostname.includes('google');

            let serpResults = [];
            if (isGoogle) {
                // Selector for Google Search Results
                const results = document.querySelectorAll('#search .g');
                serpResults = Array.from(results).map(res => {
                    const titleEl = res.querySelector('h3');
                    const linkEl = res.querySelector('a');
                    const snippetEl = res.querySelector('.VwiC3b, .st'); // Common snippet classes

                    return {
                        title: titleEl?.textContent || '',
                        url: linkEl?.href || '',
                        snippet: snippetEl?.textContent || ''
                    };
                }).filter(res => res.title && res.url);
            }

            return {
                title: document.title,
                isGoogle,
                serpResults,
                h1: Array.from(document.querySelectorAll('h1')).map(el => el.textContent.trim()),
                metaDescription: document.querySelector('meta[name="description"]')?.content || '',
                text: document.body.innerText.substring(0, 500) + '...', // Preview
                linksCount: document.querySelectorAll('a').length,
                imagesCount: document.querySelectorAll('img').length
            };
        });

        // 6. Metrics
        const metrics = {
            duration: endTime - startTime,
            status
        };

        // 7. Output Result
        const output = {
            success: true,
            id,
            url,
            data,
            metrics
        };

        // Print JSON to stdout for the server to capture
        console.log(JSON.stringify(output));

        await browser.close();

    } catch (error) {
        console.error(JSON.stringify({
            success: false,
            error: error.message,
            stack: error.stack
        }));
        process.exit(1);
    }
})();
