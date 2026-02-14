import asyncio
import logging
import os
import sys

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from scrapers.practicas_pe import PracticasPeScraper

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)


async def main() -> None:
    """
    Run the Practicas.pe scraper once and persist results to the shared database.
    """
    try:
        scraper = PracticasPeScraper()
        logging.info("Starting Practicas.pe scrape...")

        raw_data = await scraper.scrape()
        jobs = scraper.parse(raw_data)
        saved = scraper.save_jobs(jobs)

        logging.info("Practicas.pe scrape completed: %s jobs saved", saved)
        print(f"Practicas.pe scrape completed. {saved} jobs saved.")
    except Exception as e:
        logging.exception("Fatal error during Practicas.pe scrape: %s", e)
        print(f"Error during Practicas.pe scrape: {e}")


if __name__ == "__main__":
    asyncio.run(main())
