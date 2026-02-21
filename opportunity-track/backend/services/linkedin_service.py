"""
linkedin_service.py — fetches opportunities from LinkedIn via JS scraper
(stub — returns [] until LinkedIn scraper is fully implemented)
"""
from services.scraper_runner import run_scraper


def get_linkedin_opportunities(timeout: int = 30) -> list[dict]:
    """Run the LinkedIn scraper and return normalised opportunity list."""
    return run_scraper("scrapers/run_linkedin.js", timeout=timeout)
