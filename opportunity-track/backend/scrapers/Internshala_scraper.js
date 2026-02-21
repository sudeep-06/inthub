/**
 * Internshala_scraper.js — fixed to output JSON to stdout
 * Uses cloudscraper + cheerio (no Puppeteer needed)
 */
const cloudscraper = require('cloudscraper');
const cheerio = require('cheerio');

const rootUrl = 'https://internshala.com';
const internshipsUrl = 'https://internshala.com/internships/';

const scraper = cloudscraper.defaults({ jar: true });

scraper.get(rootUrl)
    .then(() => scraper.get(internshipsUrl))
    .then((html) => {
        const $ = cheerio.load(html);
        const internships = [];

        $('.individual_internship').each((i, el) => {
            const title = $(el).find('.job-internship-name a, #job_title').text().trim();
            const company = $(el).find('.company-name').text().trim();
            const location = $(el).find('.locations').text().trim();
            const stipend = $(el).find('.stipend').text().trim();
            const duration = $(el).find('.ic-16-calendar').next().text().trim() ||
                $(el).find('.ic-16-calendar').parent().text().trim();
            const link = $(el).find('#job_title').attr('href') ||
                $(el).find('.job-internship-name a').attr('href') || '';
            const url = link.startsWith('http') ? link : (link ? rootUrl + link : '');
            const skills = [];
            $(el).find('.job_skills .job_skill').each((j, skillEl) => {
                skills.push($(skillEl).text().trim());
            });

            if (title) {
                internships.push({
                    title: title,
                    company: company || 'Unknown',
                    location: location || 'Remote',
                    stipend: stipend || '',
                    duration: duration ? duration.replace(/\s+/g, ' ').trim() : '',
                    skills: skills,
                    url: url,
                    source: 'Internshala',
                });
            }
        });

        // Output ONLY JSON to stdout (runner extracts last JSON array)
        process.stdout.write(JSON.stringify(internships));
    })
    .catch((err) => {
        // On error, return empty array so runner degrades gracefully
        process.stderr.write(`Internshala scraper error: ${err.message}\n`);
        process.stdout.write(JSON.stringify([]));
        process.exit(1);
    });
