"""
workindia_service.py — fetches opportunities from WorkIndia via JS scraper
(stub — returns [] until WorkIndia scraper is fully implemented)
"""
from services.scraper_runner import run_scraper


def get_workindia_opportunities(timeout: int = 30) -> list[dict]:
    """Run the WorkIndia scraper and return normalised opportunity list."""
    return run_scraper("scrapers/run_workindia.js", timeout=timeout)
