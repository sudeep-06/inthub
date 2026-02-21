const puppeteer = require('puppeteer');

class BaseScraper {
    constructor(platformName) {
        this.platformName = platformName;
    }

    async initialize() {
        this.browser = await puppeteer.launch({
            headless: true, // Set to false for debugging
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        this.page = await this.browser.newPage();
        // Randomize user agent to avoid detection
        await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
        }
    }

    async scrape() {
        throw new Error('Method "scrape" must be implemented');
    }

    async safeGoto(url) {
        try {
            await this.page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
        } catch (error) {
            console.error(`Error navigating to ${url}: ${error.message}`);
        }
    }
}

module.exports = BaseScraper;
