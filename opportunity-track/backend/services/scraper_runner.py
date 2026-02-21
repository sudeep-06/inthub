"""
scraper_runner.py
─────────────────
Executes a JS scraper via Node.js subprocess, captures stdout, parses JSON,
and returns a normalised Python list.

Architecture: Route → Service → scraper_runner → JS Scraper → stdout JSON

Key design:
- cwd is set to BACKEND_DIR so relative require('./BaseScraper') paths resolve
- Extracts the LAST JSON array from stdout (scrapers may log text before JSON)
- All errors degrade gracefully to []
"""

import subprocess
import json
import logging
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

# Absolute path to the backend directory (where package.json lives)
BACKEND_DIR = Path(__file__).resolve().parent.parent


def run_scraper(script_path: str, timeout: int = 90) -> list[dict[str, Any]]:
    """
    Execute a JS scraper script using Node.js and return parsed JSON output.

    :param script_path: Path to the JS file, relative to BACKEND_DIR.
    :param timeout: Maximum seconds to wait for the scraper to finish.
    :returns: List of opportunity dicts. Empty list on any error.
    """
    abs_script = BACKEND_DIR / script_path

    if not abs_script.exists():
        logger.error(f"Scraper script not found: {abs_script}")
        return []

    logger.info(f"Running scraper: node {abs_script}")

    try:
        result = subprocess.run(
            ["node", str(abs_script)],
            capture_output=True,
            text=True,
            timeout=timeout,
            cwd=str(BACKEND_DIR),   # so relative requires (BaseScraper etc.) resolve
        )

        if result.returncode != 0:
            logger.warning(
                f"Scraper exited with code {result.returncode}. "
                f"stderr: {result.stderr[:500]}"
            )

        stdout = result.stdout.strip()
        if not stdout:
            logger.warning(f"Scraper produced no stdout: {abs_script}")
            return []

        # Extract the outermost JSON array: first "[" to last "]"
        first_bracket = stdout.find("[")
        last_bracket = stdout.rfind("]")
        if first_bracket == -1 or last_bracket == -1 or last_bracket <= first_bracket:
            logger.warning("No JSON array found in scraper output.")
            return []

        json_str = stdout[first_bracket:last_bracket + 1]
        data = json.loads(json_str)

        if not isinstance(data, list):
            logger.warning("Scraper output is not a JSON array.")
            return []

        logger.info(f"Scraper {abs_script.name} returned {len(data)} items")
        return data

    except subprocess.TimeoutExpired:
        logger.error(f"Scraper timed out after {timeout}s: {abs_script}")
        return []
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse scraper JSON output: {e}")
        return []
    except Exception as e:
        logger.error(f"Unexpected error running scraper {abs_script}: {e}")
        return []


def normalise_scraper_item(item: dict, source: str) -> dict:
    """
    Normalise a raw scraper result into the standard internship dict shape
    expected by the /api/internships endpoint.
    """
    import uuid
    url = item.get("url") or item.get("applyUrl") or item.get("apply_url") or ""
    return {
        "source": source,
        "internship_id": item.get("id") or item.get("internship_id") or str(uuid.uuid4()),
        "title": item.get("title", ""),
        "company": item.get("company", ""),
        "location": item.get("location", ""),
        "description": item.get("about_job") or item.get("description") or item.get("stipend", ""),
        "apply_url": url,
        "remote": "remote" in item.get("location", "").lower(),
        "tags": item.get("skills") or item.get("tags") or [],
        "job_types": ["Internship"],
        "created_at": 0,
        "stipend": item.get("stipend", ""),
        "duration": item.get("duration", ""),
    }
