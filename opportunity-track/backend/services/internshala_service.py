"""
internshala_service.py — fetches internships from Internshala via JS scraper
"""
from services.scraper_runner import run_scraper


def get_internshala_opportunities(timeout: int = 60) -> list[dict]:
    """Run the Internshala scraper and return normalised opportunity list."""
    return run_scraper("scrapers/Internshala_scraper.js", timeout=timeout)
