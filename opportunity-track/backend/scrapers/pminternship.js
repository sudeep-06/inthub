const BaseScraper = require('./BaseScraper');
const fs = require('fs');

class PMInternshipScraper extends BaseScraper {
    constructor() {
        super('PMInternshipScheme');
    }

    async scrape() {
        await this.initialize();
        const url = 'https://pminternshipscheme.com/internship-opportunities/';
        console.log(`Navigating to ${url}...`);

        try {
            await this.page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

            // Debug: Screenshot
            // await this.page.screenshot({ path: 'debug_pm_internship.png' });

            // Heuristic-based scraping
            let internships = await this.page.evaluate(() => {
                const data = [];

                // Try to find articles
                const articles = document.querySelectorAll('article, .post, .entry');
                articles.forEach(article => {
                    const titleEl = article.querySelector('h1, h2, h3, h4');
                    const linkEl = article.querySelector('a');

                    if (titleEl && linkEl) {
                        data.push({
                            title: titleEl.innerText.trim(),
                            company: 'Government of India',
                            location: 'Pan India',
                            stipend: 'Check listing',
                            duration: '12 months',
                            description: 'Opportunity under PM Internship Scheme.',
                            applyUrl: linkEl.href,
                            source: 'PMInternshipScheme',
                            postedAt: new Date()
                        });
                    }
                });
                return data;
            });

            if (internships.length === 0) {
                console.log('No listings found via scraping. Using fallback data.');
                internships = [
                    {
                        title: 'Software Developer Intern (Fallback)',
                        company: 'GovTech India',
                        location: 'Remote',
                        stipend: '₹15,000/month',
                        duration: '6 months',
                        description: 'This is a fallback listing because scraping returned 0 results.',
                        applyUrl: 'https://pminternshipscheme.com/fallback-scrape-zero',
                        source: 'PMInternshipScheme',
                        postedAt: new Date()
                    }
                ];
            }

            console.log(`Found ${internships.length} listings.`);
            return internships;

        } catch (error) {
            console.error('Error scraping PM Internship Scheme:', error);
            return [
                {
                    title: 'Software Developer Intern (Error)',
                    company: 'GovTech India',
                    location: 'Remote',
                    stipend: '₹15,000/month',
                    duration: '6 months',
                    description: 'This is a fallback listing because scraping failed completely.',
                    applyUrl: 'https://pminternshipscheme.com/fallback-error',
                    source: 'PMInternshipScheme',
                    postedAt: new Date()
                }
            ];
        }
    }
}

module.exports = PMInternshipScraper;
