"""
pminternship_service.py — fetches opportunities from PM Internship Scheme via JS scraper
"""
from services.scraper_runner import run_scraper


def get_pminternship_opportunities(timeout: int = 90) -> list[dict]:
    """Run the PM Internship scraper and return normalised opportunity list."""
    return run_scraper("scrapers/run_pminternship.js", timeout=timeout)
