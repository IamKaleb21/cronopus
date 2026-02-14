"""
Conftest for telegram-bot tests.
Adds the telegram-bot directory to sys.path so imports work
despite the hyphenated directory name.
"""
import sys
from pathlib import Path

# Map 'telegram_bot' import to 'telegram-bot' directory
bot_dir = Path(__file__).parent.parent
sys.path.insert(0, str(bot_dir.parent))

# Register telegram-bot directory as telegram_bot package
import importlib
import types

# Create the telegram_bot package pointing to the telegram-bot directory
telegram_bot_pkg = types.ModuleType("telegram_bot")
telegram_bot_pkg.__path__ = [str(bot_dir)]
telegram_bot_pkg.__package__ = "telegram_bot"
sys.modules["telegram_bot"] = telegram_bot_pkg
