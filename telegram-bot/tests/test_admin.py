"""
Tests for Admin Commands (TDD - RED phase)
Phase 3.4: /status command
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch


OWNER_CHAT_ID = "123456789"
FAKE_TOKEN = "0000000000:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"


def make_update(chat_id: int, text: str = "/status"):
    update = MagicMock()
    update.effective_chat = MagicMock()
    update.effective_chat.id = chat_id
    update.message = MagicMock()
    update.message.text = text
    update.message.reply_text = AsyncMock()
    return update


def make_context():
    return MagicMock()


@pytest.fixture
def bot():
    from telegram_bot.bot import CronOpusBot
    return CronOpusBot(token=FAKE_TOKEN, owner_chat_id=OWNER_CHAT_ID)


class TestStatusCommand:
    """Tests for /status admin command."""

    @pytest.mark.asyncio
    async def test_status_shows_counts_by_status(self, bot):
        """Status should show count of jobs per status."""
        counts = {"NEW": 50, "SAVED": 10, "DISCARDED": 30}

        with patch.object(bot, "get_status_counts", return_value=counts):
            update = make_update(chat_id=int(OWNER_CHAT_ID))
            context = make_context()

            await bot.status_command(update, context)

            reply = update.message.reply_text.call_args[0][0]
            assert "50" in reply
            assert "10" in reply
            assert "30" in reply

    @pytest.mark.asyncio
    async def test_status_shows_total(self, bot):
        """Status should show the total number of jobs."""
        counts = {"NEW": 50, "SAVED": 10, "DISCARDED": 30}

        with patch.object(bot, "get_status_counts", return_value=counts):
            update = make_update(chat_id=int(OWNER_CHAT_ID))
            context = make_context()

            await bot.status_command(update, context)

            reply = update.message.reply_text.call_args[0][0]
            assert "90" in reply  # total

    @pytest.mark.asyncio
    async def test_status_blocks_stranger(self, bot):
        """Status from non-owner should be ignored."""
        update = make_update(chat_id=999999999)
        context = make_context()

        with patch.object(bot, "get_status_counts", return_value={}):
            await bot.status_command(update, context)

        update.message.reply_text.assert_not_called()

    @pytest.mark.asyncio
    async def test_status_empty_db(self, bot):
        """Status with empty DB should still respond gracefully."""
        counts = {}

        with patch.object(bot, "get_status_counts", return_value=counts):
            update = make_update(chat_id=int(OWNER_CHAT_ID))
            context = make_context()

            await bot.status_command(update, context)

            update.message.reply_text.assert_called_once()
            reply = update.message.reply_text.call_args[0][0]
            assert "0" in reply  # total is 0
