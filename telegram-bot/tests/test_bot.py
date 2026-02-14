"""
Tests for CronOpusBot (TDD - RED phase)
Tests written BEFORE implementation to define expected behavior.
"""
import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch


# ─── Helpers ─────────────────────────────────────────────────────────────────

OWNER_CHAT_ID = "123456789"
FAKE_TOKEN = "0000000000:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"


def make_update(chat_id: int, text: str = "/start"):
    """Create a mock Telegram Update object."""
    update = MagicMock()
    update.effective_chat = MagicMock()
    update.effective_chat.id = chat_id
    update.message = MagicMock()
    update.message.text = text
    update.message.reply_text = AsyncMock()
    return update


def make_context():
    """Create a mock CallbackContext."""
    return MagicMock()


# ─── Tests ───────────────────────────────────────────────────────────────────

@pytest.fixture
def bot():
    """Create a CronOpusBot instance with fake credentials."""
    from telegram_bot.bot import CronOpusBot
    return CronOpusBot(token=FAKE_TOKEN, owner_chat_id=OWNER_CHAT_ID)


class TestAuthGuard:
    """Tests for the owner-only auth guard."""

    @pytest.mark.asyncio
    async def test_auth_guard_allows_owner(self, bot):
        """Messages from the owner chat_id should be processed."""
        update = make_update(chat_id=int(OWNER_CHAT_ID), text="/start")
        context = make_context()

        await bot.start_command(update, context)

        # Owner's message was processed → reply_text was called
        update.message.reply_text.assert_called_once()

    @pytest.mark.asyncio
    async def test_auth_guard_blocks_stranger(self, bot):
        """Messages from unknown chat_ids should be silently ignored."""
        update = make_update(chat_id=999999999, text="/start")
        context = make_context()

        await bot.start_command(update, context)

        # Stranger's message was NOT processed → reply_text was NOT called
        update.message.reply_text.assert_not_called()


class TestCommands:
    """Tests for bot commands."""

    @pytest.mark.asyncio
    async def test_start_command_response(self, bot):
        """The /start command should reply with a welcome message."""
        update = make_update(chat_id=int(OWNER_CHAT_ID), text="/start")
        context = make_context()

        await bot.start_command(update, context)

        reply_text = update.message.reply_text.call_args[0][0]
        assert "cronopus" in reply_text.lower() or "bienvenido" in reply_text.lower()

    @pytest.mark.asyncio
    async def test_help_command_response(self, bot):
        """The /help command should list available commands."""
        update = make_update(chat_id=int(OWNER_CHAT_ID), text="/help")
        context = make_context()

        await bot.help_command(update, context)

        reply_text = update.message.reply_text.call_args[0][0]
        # Should mention at least /start and /help
        assert "/start" in reply_text
        assert "/help" in reply_text


class TestConfig:
    """Tests for bot configuration."""

    def test_bot_config_loads_token_and_chat_id(self, bot):
        """Bot should store the token and owner_chat_id."""
        assert bot.owner_chat_id == int(OWNER_CHAT_ID)

    def test_bot_config_from_settings(self):
        """Bot can be created from backend Settings."""
        with patch("telegram_bot.bot.get_settings") as mock_settings:
            mock_settings.return_value = MagicMock(
                telegram_bot_token=FAKE_TOKEN,
                telegram_chat_id=OWNER_CHAT_ID,
            )

            from telegram_bot.bot import CronOpusBot
            bot = CronOpusBot.from_settings()

            assert bot.owner_chat_id == int(OWNER_CHAT_ID)
