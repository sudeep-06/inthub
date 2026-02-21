"""
routes/opportunities.py
───────────────────────
FastAPI router for JS-scraper-powered opportunity endpoints.

Architecture: Route → Service → scraper_runner → JS Scraper → stdout JSON
"""

from fastapi import APIRouter, Query, HTTPException
from typing import Optional

from services.internshala_service  import get_internshala_opportunities
from services.linkedin_service     import get_linkedin_opportunities
from services.indeed_service       import get_indeed_opportunities
from services.pminternship_service import get_pminternship_opportunities
from services.workindia_service    import get_workindia_opportunities
from services.aggregator_service   import get_all_opportunities

router = APIRouter(prefix="/api/opportunities", tags=["opportunities"])


@router.get("/internshala")
async def opportunities_internshala():
    """
    Scrape and return internships from Internshala.
    Uses cloudscraper + cheerio (no browser needed).
    """
    import asyncio
    from concurrent.futures import ThreadPoolExecutor
    loop = asyncio.get_event_loop()
    results = await loop.run_in_executor(None, get_internshala_opportunities)
    return {"source": "Internshala", "total": len(results), "results": results}


@router.get("/linkedin")
async def opportunities_linkedin():
    """
    Return LinkedIn opportunities (stub — returns [] until implemented).
    """
    import asyncio
    loop = asyncio.get_event_loop()
    results = await loop.run_in_executor(None, get_linkedin_opportunities)
    return {"source": "LinkedIn", "total": len(results), "results": results}


@router.get("/indeed")
async def opportunities_indeed():
    """
    Return Indeed opportunities (stub — returns [] until implemented).
    """
    import asyncio
    loop = asyncio.get_event_loop()
    results = await loop.run_in_executor(None, get_indeed_opportunities)
    return {"source": "Indeed", "total": len(results), "results": results}


@router.get("/pminternship")
async def opportunities_pminternship():
    """
    Scrape and return opportunities from PM Internship Scheme (Puppeteer).
    """
    import asyncio
    loop = asyncio.get_event_loop()
    results = await loop.run_in_executor(None, get_pminternship_opportunities)
    return {"source": "PMInternshipScheme", "total": len(results), "results": results}


@router.get("/all")
async def opportunities_all(
    sources: Optional[str] = Query(
        default=None,
        description="Comma-separated source names to include, e.g. 'internshala,linkedin'. "
                    "Omit to include all sources."
    )
):
    """
    Aggregate opportunities from all (or selected) sources concurrently.
    Each scraper runs in a thread pool so the event loop stays non-blocking.
    """
    source_list = [s.strip() for s in sources.split(",")] if sources else None
    data = await get_all_opportunities(sources=source_list)
    return data
