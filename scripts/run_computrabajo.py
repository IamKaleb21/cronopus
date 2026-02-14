import asyncio
import logging
import os
import sys

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from scrapers.computrabajo import CompuTrabajoScraper

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)


async def main() -> None:
    """
    Run the CompuTrabajo scraper once and persist results to the shared database.
    Also writes a JSON snapshot to a local file for debugging.
    """
    try:
        scraper = CompuTrabajoScraper()
        logging.info("Starting FULL CompuTrabajo scrape...")
        logging.info("Targeting %s URL categories.", len(scraper.BASE_URLS))

        # Run with default max_pages (5) for a full scrape
        raw_json = await scraper.scrape(max_pages=5)
        jobs = scraper.parse(raw_json)
        saved = scraper.save_jobs(jobs)

        # Keep JSON artifact for debugging/inspection
        output_file = "computrabajo_results.json"
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(raw_json)

        logging.info(
            "Full CompuTrabajo scrape completed: %s jobs saved (JSON -> %s)",
            saved,
            output_file,
        )
        print(f"Full CompuTrabajo scrape completed. {saved} jobs saved.")
    except Exception as e:
        logging.exception("Fatal error during CompuTrabajo scrape: %s", e)
        print(f"Error during scrape: {e}")


if __name__ == "__main__":
    asyncio.run(main())
