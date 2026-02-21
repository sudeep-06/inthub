/**
 * run_workindia.js — runner wrapper for WorkIndiaScraper (stub)
 * Returns empty array until WorkIndia scraping is implemented.
 */
const WorkIndiaScraper = require('./workindia');

(async () => {
    const scraper = new WorkIndiaScraper();
    try {
        const raw = await scraper.scrape();
        const normalised = (raw || []).map(item => ({
            title: item.title || 'Untitled',
            company: item.company || '',
            location: item.location || '',
            url: item.url || '',
            source: 'WorkIndia',
        }));
        process.stdout.write(JSON.stringify(normalised));
    } catch (err) {
        process.stderr.write(`WorkIndia scraper error: ${err.message}\n`);
        process.stdout.write(JSON.stringify([]));
        process.exit(1);
    } finally {
        await scraper.close().catch(() => { });
    }
})();
