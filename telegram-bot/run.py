"""
CronOpus Telegram Bot - CLI Runner
Usage: uv run telegram-bot/run.py
"""
import logging
import sys
import os

# Add project root and telegram-bot directory to path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, project_root)
sys.path.insert(0, os.path.join(project_root, 'telegram-bot'))

from bot import CronOpusBot

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def main():
    logger.info("Initializing CronOpus Telegram Bot...")
    
    bot = CronOpusBot.from_settings()
    
    if not bot.token:
        logger.error("TELEGRAM_BOT_TOKEN not configured. Set it in .env")
        sys.exit(1)
    
    if not bot.owner_chat_id:
        logger.error("TELEGRAM_CHAT_ID not configured. Set it in .env")
        sys.exit(1)
    
    logger.info("Bot configured. Starting long-polling...")
    bot.run_polling()


if __name__ == "__main__":
    main()
