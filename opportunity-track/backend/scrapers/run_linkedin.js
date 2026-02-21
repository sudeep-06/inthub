/**
 * run_linkedin.js — runner wrapper for LinkedInScraper (stub)
 * Returns empty array until LinkedIn scraping is implemented.
 */
const LinkedInScraper = require('./linkedin');

(async () => {
    const scraper = new LinkedInScraper();
    try {
        const raw = await scraper.scrape();
        const normalised = (raw || []).map(item => ({
            title: item.title || 'Untitled',
            company: item.company || '',
            location: item.location || '',
            url: item.url || '',
            source: 'LinkedIn',
        }));
        process.stdout.write(JSON.stringify(normalised));
    } catch (err) {
        process.stderr.write(`LinkedIn scraper error: ${err.message}\n`);
        process.stdout.write(JSON.stringify([]));
        process.exit(1);
    } finally {
        await scraper.close().catch(() => { });
    }
})();
