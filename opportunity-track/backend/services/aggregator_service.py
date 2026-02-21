"""
aggregator_service.py
─────────────────────
Runs ALL JS scrapers concurrently in a thread pool, also fetches Arbeitnow
and Remotive APIs, merges all results, deduplicates by (title+company), and
returns a unified listing set.

Architecture:
  Route (/api/internships or /api/opportunities/all)
    → aggregator_service.get_all_opportunities()
      → [scraper_runner threads] + [httpx Arbeitnow/Remotive]
        → merge → deduplicate → return
"""

import asyncio
import logging
import uuid
import httpx
from concurrent.futures import ThreadPoolExecutor
from typing import Optional

from services.scraper_runner import run_scraper, normalise_scraper_item

logger = logging.getLogger(__name__)

# Thread pool for blocking subprocess calls
_executor = ThreadPoolExecutor(max_workers=6, thread_name_prefix="scraper")

# ── External API helpers ─────────────────────────────────────────────────────

ARBEITNOW_API = "https://www.arbeitnow.com/api/job-board-api"
REMOTIVE_API  = "https://remotive.com/api/remote-jobs"


async def _fetch_arbeitnow(page: int = 1) -> tuple[list[dict], bool]:
    try:
        async with httpx.AsyncClient(timeout=15.0) as c:
            r = await c.get(f"{ARBEITNOW_API}?page={page}")
            r.raise_for_status()
            data = r.json()
        jobs = []
        for j in data.get("data", []):
            jobs.append({
                "source":        "Arbeitnow",
                "internship_id": j.get("slug", str(uuid.uuid4())),
                "title":         j.get("title", ""),
                "company":       j.get("company_name", ""),
                "location":      j.get("location", ""),
                "description":   j.get("description", ""),
                "apply_url":     j.get("url", ""),
                "remote":        j.get("remote", False),
                "tags":          j.get("tags", []),
                "job_types":     j.get("job_types", []),
                "created_at":    j.get("created_at", 0),
                "stipend":       "",
                "duration":      "",
            })
        has_next = data.get("links", {}).get("next") is not None
        return jobs, has_next
    except Exception as e:
        logger.error(f"Arbeitnow fetch error: {e}")
        return [], False


async def _fetch_remotive() -> list[dict]:
    try:
        async with httpx.AsyncClient(timeout=15.0) as c:
            r = await c.get(f"{REMOTIVE_API}?limit=50")
            r.raise_for_status()
            data = r.json()
        jobs = []
        for j in data.get("jobs", []):
            jobs.append({
                "source":        "Remotive",
                "internship_id": f"remotive-{j.get('id', uuid.uuid4())}",
                "title":         j.get("title", ""),
                "company":       j.get("company_name", ""),
                "location":      j.get("candidate_required_location", "Anywhere"),
                "description":   j.get("description", ""),
                "apply_url":     j.get("url", ""),
                "remote":        True,
                "tags":          j.get("tags", []) or [],
                "job_types":     [j.get("job_type", "")],
                "created_at":    0,
                "stipend":       "",
                "duration":      "",
            })
        return jobs
    except Exception as e:
        logger.error(f"Remotive fetch error: {e}")
        return []


# ── JS scraper helpers ───────────────────────────────────────────────────────

_SCRAPERS = [
    ("scrapers/Internshala_scraper.js", "Internshala", 60),
    ("scrapers/run_linkedin.js",        "LinkedIn",    30),
    ("scrapers/run_indeed.js",          "Indeed",      30),
    ("scrapers/run_workindia.js",       "WorkIndia",   30),
    ("scrapers/run_pminternship.js",    "PMInternship",90),
]


async def _run_scraper_async(script: str, source: str, timeout: int) -> list[dict]:
    """Run a single JS scraper in a thread and normalise its output."""
    loop = asyncio.get_event_loop()
    raw = await loop.run_in_executor(_executor, run_scraper, script, timeout)
    return [normalise_scraper_item(item, source) for item in raw]


# ── Deduplication ────────────────────────────────────────────────────────────

def _dedup(jobs: list[dict]) -> list[dict]:
    """Deduplicate by (title.lower() + company.lower()), preserving order."""
    seen: set[str] = set()
    unique: list[dict] = []
    for j in jobs:
        key = f"{j.get('title','').lower().strip()}|{j.get('company','').lower().strip()}"
        if key not in seen:
            seen.add(key)
            unique.append(j)
    return unique


# ── Main public API ──────────────────────────────────────────────────────────

async def get_all_opportunities(
    page: int = 1,
    sources: Optional[list[str]] = None,
) -> dict:
    """
    Run JS scrapers concurrently with Arbeitnow + Remotive, merge, deduplicate.

    :param page:    Page number passed to Arbeitnow (scrapers always return full set).
    :param sources: Optional filter list (e.g. ["internshala", "arbeitnow"]).
                    None = all sources.
    :returns: {results, total, has_next, sources}
    """
    enabled = set(s.lower() for s in sources) if sources else None

    def _want(name: str) -> bool:
        return enabled is None or name.lower() in enabled

    # Launch everything concurrently
    tasks: list = []

    # API sources
    if _want("arbeitnow"):
        tasks.append(("__arbeitnow", _fetch_arbeitnow(page)))
    if _want("remotive") and page == 1:
        tasks.append(("__remotive", _fetch_remotive()))

    # JS scrapers
    for script, source, timeout in _SCRAPERS:
        if _want(source):
            tasks.append((source, _run_scraper_async(script, source, timeout)))

    # Await all
    gathered = await asyncio.gather(
        *[coro for (_, coro) in tasks],
        return_exceptions=True,
    )

    results: list[dict] = []
    source_summary: dict = {}
    has_next = False

    for (name, _), outcome in zip(tasks, gathered):
        if isinstance(outcome, Exception):
            logger.error(f"Source '{name}' raised: {outcome}")
            source_summary[name] = {"count": 0, "status": "error"}
            continue

        if name == "__arbeitnow":
            jobs, hn = outcome
            results.extend(jobs)
            has_next = hn
            source_summary["Arbeitnow"] = {"count": len(jobs), "status": "ok"}
        elif name == "__remotive":
            results.extend(outcome)
            source_summary["Remotive"] = {"count": len(outcome), "status": "ok"}
        else:
            results.extend(outcome)
            source_summary[name] = {"count": len(outcome), "status": "ok"}

    results = _dedup(results)

    return {
        "results":  results,
        "total":    len(results),
        "has_next": has_next,
        "sources":  source_summary,
    }
