const BaseScraper = require('./BaseScraper');

class IndeedScraper extends BaseScraper {
    constructor() {
        super('Indeed');
    }

    async scrape() {
        console.log('Indeed scraping is not yet implemented.');
        return [];
    }
}

module.exports = IndeedScraper;
