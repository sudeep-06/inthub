/**
 * run_pminternship.js — runner wrapper for PMInternshipScraper class
 * Instantiates the class, calls scrape(), normalises output, prints JSON to stdout.
 */
const PMInternshipScraper = require('./pminternship');

(async () => {
    const scraper = new PMInternshipScraper();
    try {
        const raw = await scraper.scrape();

        const normalised = (raw || []).map(item => ({
            title: item.title || 'Untitled',
            company: item.company || 'Government of India',
            location: item.location || 'Pan India',
            url: item.applyUrl || item.url || '',
            stipend: item.stipend || '',
            duration: item.duration || '',
            source: 'PMInternshipScheme',
        }));

        process.stdout.write(JSON.stringify(normalised));
    } catch (err) {
        process.stderr.write(`PMInternship scraper error: ${err.message}\n`);
        process.stdout.write(JSON.stringify([]));
        process.exit(1);
    } finally {
        await scraper.close().catch(() => { });
    }
})();
