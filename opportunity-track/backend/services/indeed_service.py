"""
indeed_service.py — fetches opportunities from Indeed via JS scraper
(stub — returns [] until Indeed scraper is fully implemented)
"""
from services.scraper_runner import run_scraper


def get_indeed_opportunities(timeout: int = 30) -> list[dict]:
    """Run the Indeed scraper and return normalised opportunity list."""
    return run_scraper("scrapers/run_indeed.js", timeout=timeout)
