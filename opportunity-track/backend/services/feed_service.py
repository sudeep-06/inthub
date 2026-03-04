"""
feed_service.py — Real-time feed aggregation
─────────────────────────────────────────────
Fetches live data from RSS/JSON feeds: TechCrunch, Devpost, Internshala
announcements, and GitHub Education. Results are cached for 5 minutes
to avoid hammering external sources on every request.

Architecture: Route → feed_service → [RSS feeds, Devpost API, static fallbacks]
"""

import httpx
import asyncio
import logging
import time
import uuid
import re
import xml.etree.ElementTree as ET
from typing import Any

logger = logging.getLogger(__name__)

# ── 5-minute TTL cache ──────────────────────────────────────────────────────
_CACHE: dict[str, Any] = {}
_CACHE_TTL = 300  # seconds


def _get_cached(key: str):
    entry = _CACHE.get(key)
    if entry and (time.time() - entry["ts"]) < _CACHE_TTL:
        return entry["data"]
    return None


def _set_cached(key: str, data):
    _CACHE[key] = {"data": data, "ts": time.time()}


# ── RSS parser helper ───────────────────────────────────────────────────────

def _parse_rss(xml_text: str, source: str, item_type: str = "article") -> list[dict]:
    items = []
    try:
        root = ET.fromstring(xml_text)
        channel = root.find("channel")
        if channel is None:
            return []
        for entry in channel.findall("item")[:10]:
            title = (entry.findtext("title") or "").strip()
            link  = (entry.findtext("link")  or "").strip()
            desc  = (entry.findtext("description") or "").strip()
            # Strip HTML tags from description
            desc_clean = re.sub(r'<[^>]+>', '', desc)[:300].strip()
            pub   = (entry.findtext("pubDate") or "").strip()[:16]

            if not title:
                continue
            items.append({
                "id":          f"{source}-{uuid.uuid5(uuid.NAMESPACE_URL, link or title)}",
                "type":        item_type,
                "title":       title,
                "company":     source,
                "description": desc_clean,
                "location":    "",
                "date":        pub,
                "url":         link,
                "skills":      [],
                "source":      source,
            })
    except ET.ParseError as e:
        logger.warning(f"RSS parse error for {source}: {e}")
    return items


async def _fetch_rss(url: str, source: str, item_type: str = "article",
                     client: httpx.AsyncClient = None) -> list[dict]:
    try:
        own_client = client is None
        if own_client:
            client = httpx.AsyncClient(timeout=10.0, follow_redirects=True)
        r = await client.get(url)
        if own_client:
            await client.aclose()
        r.raise_for_status()
        return _parse_rss(r.text, source, item_type)
    except Exception as e:
        logger.warning(f"Failed to fetch RSS from {url}: {e}")
        return []


# ── Devpost hackathons ──────────────────────────────────────────────────────

async def _fetch_devpost_hackathons(client: httpx.AsyncClient) -> list[dict]:
    """Fetch from Devpost RSS — active hackathons."""
    return await _fetch_rss(
        "https://devpost.com/hackathons.atom",
        source="Devpost",
        item_type="hackathon",
        client=client,
    )


# ── TechCrunch tech news ────────────────────────────────────────────────────

async def _fetch_techcrunch(client: httpx.AsyncClient) -> list[dict]:
    return await _fetch_rss(
        "https://techcrunch.com/feed/",
        source="TechCrunch",
        item_type="article",
        client=client,
    )


# ── HackerNews jobs feed ────────────────────────────────────────────────────

async def _fetch_hackernews_jobs(client: httpx.AsyncClient) -> list[dict]:
    return await _fetch_rss(
        "https://hnrss.org/jobs",
        source="HackerNews",
        item_type="announcement",
        client=client,
    )


# ── GitHub blog ─────────────────────────────────────────────────────────────

async def _fetch_github_blog(client: httpx.AsyncClient) -> list[dict]:
    return await _fetch_rss(
        "https://github.blog/feed/",
        source="GitHub",
        item_type="announcement",
        client=client,
    )


# ── Static curated fallback items (always included) ─────────────────────────

_CURATED = [
    {
        "id": "curated-1", "type": "program",
        "title": "Google Summer of Code 2025",
        "company": "Google", "source": "Google",
        "description": "Contribute to open-source projects with mentoring from experienced developers. Stipend provided.",
        "location": "Remote", "date": "May–Aug 2025",
        "url": "https://summerofcode.withgoogle.com",
        "skills": ["Python", "JavaScript", "Open Source", "Git"],
    },
    {
        "id": "curated-2", "type": "program",
        "title": "GirlScript Summer of Code 2025",
        "company": "GirlScript Foundation", "source": "GirlScript",
        "description": "3-month open-source program for beginners. Contribute, learn, and grow.",
        "location": "Remote", "date": "Mar–May 2025",
        "url": "https://gssoc.girlscript.tech",
        "skills": ["Open Source", "React", "Python", "JavaScript"],
    },
    {
        "id": "curated-3", "type": "hackathon",
        "title": "Smart India Hackathon 2025",
        "company": "Government of India", "source": "MoE India",
        "description": "Nationwide initiative to solve real government problems using technology.",
        "location": "Pan India", "date": "Aug 2025",
        "url": "https://sih.gov.in",
        "skills": ["AI", "IoT", "Blockchain", "Web Development"],
    },
    {
        "id": "curated-4", "type": "hackathon",
        "title": "MLH Global Hack Week",
        "company": "Major League Hacking", "source": "MLH",
        "description": "Week-long hackathon with workshops, prizes and networking opportunities.",
        "location": "Remote", "date": "2025",
        "url": "https://ghw.mlh.io",
        "skills": ["React", "Node.js", "Python", "Machine Learning"],
    },
    {
        "id": "curated-5", "type": "internship",
        "title": "Amazon SDE Intern — Summer 2025",
        "company": "Amazon", "source": "Amazon Careers",
        "description": "Work on large-scale distributed systems with mentorship from senior engineers.",
        "location": "Bangalore, India", "date": "Jun–Aug 2025",
        "url": "https://amazon.jobs",
        "skills": ["Java", "AWS", "System Design", "Data Structures"],
    },
    {
        "id": "curated-6", "type": "event",
        "title": "PyCon India 2025",
        "company": "Python Software Society of India", "source": "PyCon India",
        "description": "India's premier Python conference with talks, workshops, sprints and networking.",
        "location": "Bangalore, India", "date": "Sep 2025",
        "url": "https://in.pycon.org/2025",
        "skills": ["Python", "Django", "Data Science", "Machine Learning"],
    },
    {
        "id": "curated-7", "type": "program",
        "title": "Kaggle Machine Learning Competitions 2025",
        "company": "Kaggle / Google", "source": "Kaggle",
        "description": "Compete in real-world data science challenges with prizes, mentorship, and community. Build your ML portfolio with hands-on projects.",
        "location": "Remote", "date": "Year-round 2025",
        "url": "https://www.kaggle.com/competitions",
        "skills": ["Machine Learning", "Python", "Data Science", "TensorFlow", "PyTorch"],
    },
    {
        "id": "curated-8", "type": "program",
        "title": "AWS AI & ML Scholarship Program",
        "company": "Amazon Web Services", "source": "AWS",
        "description": "Free AI/ML courses, scholarships, and career resources from AWS. Covers machine learning fundamentals to advanced deep learning.",
        "location": "Remote", "date": "2025",
        "url": "https://aws.amazon.com/machine-learning/scholarship/",
        "skills": ["AI", "Machine Learning", "Cloud", "Python", "Deep Learning"],
    },
    {
        "id": "curated-9", "type": "event",
        "title": "DeepLearning.AI Community Events 2025",
        "company": "DeepLearning.AI", "source": "DeepLearning.AI",
        "description": "Andrew Ng's platform offering monthly AI events, workshops, and networking for aspiring AI engineers and data scientists.",
        "location": "Remote", "date": "Monthly 2025",
        "url": "https://www.deeplearning.ai/events/",
        "skills": ["Deep Learning", "NLP", "Computer Vision", "Generative AI", "Python"],
    },
    {
        "id": "curated-10", "type": "program",
        "title": "Hugging Face Open-Source Fellowship",
        "company": "Hugging Face", "source": "Hugging Face",
        "description": "Contribute to open-source AI/ML projects at Hugging Face. Build transformers, datasets, and AI tools used by millions of developers.",
        "location": "Remote", "date": "Rolling 2025",
        "url": "https://huggingface.co/join",
        "skills": ["LLM", "Generative AI", "Python", "NLP", "Transformers", "Machine Learning"],
    },
    {
        "id": "curated-11", "type": "hackathon",
        "title": "IEEE DataPort Data Science Challenge",
        "company": "IEEE", "source": "IEEE",
        "description": "Annual data science competition using real-world datasets for machine learning, analytics, and AI innovation projects.",
        "location": "Remote", "date": "2025",
        "url": "https://ieee-dataport.org/competitions",
        "skills": ["Data Science", "Machine Learning", "Analytics", "Python", "Statistics"],
    },
]


# ── Main aggregator ──────────────────────────────────────────────────────────

CACHE_KEY = "feed_items"


async def get_feed_items() -> list[dict]:
    """
    Return merged, deduplicated feed items from live sources + curated fallbacks.
    Results are cached for 5 minutes.
    """
    cached = _get_cached(CACHE_KEY)
    if cached is not None:
        logger.info(f"Feed: returning {len(cached)} cached items")
        return cached

    logger.info("Feed: fetching live data from RSS sources…")

    async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
        results = await asyncio.gather(
            _fetch_devpost_hackathons(client),
            _fetch_techcrunch(client),
            _fetch_hackernews_jobs(client),
            _fetch_github_blog(client),
            return_exceptions=True,
        )

    merged: list[dict] = list(_CURATED)  # always start with curated items

    for batch in results:
        if isinstance(batch, Exception):
            logger.warning(f"Feed source failed: {batch}")
        elif isinstance(batch, list):
            merged.extend(batch)

    # Deduplicate by URL, then by title
    seen_urls: set[str] = set()
    seen_titles: set[str] = set()
    unique: list[dict] = []
    for item in merged:
        url   = item.get("url", "")
        title = item.get("title", "").lower().strip()
        if url and url in seen_urls:
            continue
        if title in seen_titles:
            continue
        if url:
            seen_urls.add(url)
        seen_titles.add(title)
        unique.append(item)

    _set_cached(CACHE_KEY, unique)
    logger.info(f"Feed: cached {len(unique)} items from {len(merged)} raw")
    return unique
