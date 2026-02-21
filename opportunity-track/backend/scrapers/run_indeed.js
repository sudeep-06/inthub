/**
 * run_indeed.js — runner wrapper for IndeedScraper (stub)
 * Returns empty array until Indeed scraping is implemented.
 */
const IndeedScraper = require('./indeed');

(async () => {
    const scraper = new IndeedScraper();
    try {
        const raw = await scraper.scrape();
        const normalised = (raw || []).map(item => ({
            title: item.title || 'Untitled',
            company: item.company || '',
            location: item.location || '',
            url: item.url || '',
            source: 'Indeed',
        }));
        process.stdout.write(JSON.stringify(normalised));
    } catch (err) {
        process.stderr.write(`Indeed scraper error: ${err.message}\n`);
        process.stdout.write(JSON.stringify([]));
        process.exit(1);
    } finally {
        await scraper.close().catch(() => { });
    }
})();
