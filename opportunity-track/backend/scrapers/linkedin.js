const BaseScraper = require('./BaseScraper');

class LinkedInScraper extends BaseScraper {
    constructor() {
        super('LinkedIn');
    }

    async scrape() {
        console.log('LinkedIn scraping is not yet implemented (requires complex auth/evasion).');
        return [];
    }
}

module.exports = LinkedInScraper;
