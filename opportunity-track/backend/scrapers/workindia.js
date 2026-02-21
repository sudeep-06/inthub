const BaseScraper = require('./BaseScraper');

class WorkIndiaScraper extends BaseScraper {
    constructor() {
        super('WorkIndia');
    }

    async scrape() {
        console.log('WorkIndia scraping is not yet implemented.');
        return [];
    }
}

module.exports = WorkIndiaScraper;
