"""
Tests for /digest pagination (TDD - RED phase)
Sends jobs in batches of 10 with a ➡️ Más button.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch


OWNER_CHAT_ID = "123456789"
FAKE_TOKEN = "0000000000:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"

PAGE_SIZE = 10


def make_fake_job(i=1):
    job = MagicMock()
    job.title = f"Job {i}"
    job.company = f"Company {i}"
    job.location = "Lima"
    job.salary = None
    job.url = f"https://example.com/job/{i}"
    job.status = "NEW"
    job.id = f"uuid-{i}"
    return job


def make_update(chat_id: int, text: str = "/digest"):
    update = MagicMock()
    update.effective_chat = MagicMock()
    update.effective_chat.id = chat_id
    update.message = MagicMock()
    update.message.text = text
    update.message.reply_text = AsyncMock()
    return update


def make_callback_query(chat_id: int, data: str):
    update = MagicMock()
    update.effective_chat = MagicMock()
    update.effective_chat.id = chat_id
    update.callback_query = MagicMock()
    update.callback_query.data = data
    update.callback_query.answer = AsyncMock()
    update.callback_query.message = MagicMock()
    update.callback_query.message.reply_text = AsyncMock()
    update.callback_query.edit_message_text = AsyncMock()
    return update


def make_context():
    return MagicMock()


@pytest.fixture
def bot():
    from telegram_bot.bot import CronOpusBot
    return CronOpusBot(token=FAKE_TOKEN, owner_chat_id=OWNER_CHAT_ID)


class TestDigestPagination:
    """Tests for paginated /digest command."""

    @pytest.mark.asyncio
    async def test_digest_sends_only_first_page(self, bot):
        """With 25 jobs, /digest should send only first 10 + summary."""
        jobs = [make_fake_job(i) for i in range(25)]

        with patch.object(bot, "get_new_jobs", return_value=jobs):
            update = make_update(chat_id=int(OWNER_CHAT_ID))
            context = make_context()
            await bot.digest_command(update, context)

            # 1 summary + 10 cards + 1 "more" button = 12 calls
            # But the "more" button is on the last card, so actually:
            # 1 summary + 10 cards = 11 calls
            assert update.message.reply_text.call_count == 1 + PAGE_SIZE

    @pytest.mark.asyncio
    async def test_digest_summary_shows_total(self, bot):
        """Summary should show total count, not just page count."""
        jobs = [make_fake_job(i) for i in range(25)]

        with patch.object(bot, "get_new_jobs", return_value=jobs):
            update = make_update(chat_id=int(OWNER_CHAT_ID))
            context = make_context()
            await bot.digest_command(update, context)

            summary = update.message.reply_text.call_args_list[0][0][0]
            assert "25" in summary

    @pytest.mark.asyncio
    async def test_last_card_has_more_button(self, bot):
        """When there are more jobs, the last message should have ➡️ Más."""
        jobs = [make_fake_job(i) for i in range(25)]

        with patch.object(bot, "get_new_jobs", return_value=jobs):
            update = make_update(chat_id=int(OWNER_CHAT_ID))
            context = make_context()
            await bot.digest_command(update, context)

            # Last call should have a reply_markup with "Más" button
            last_call = update.message.reply_text.call_args_list[-1]
            keyboard = last_call[1].get("reply_markup")
            assert keyboard is not None
            all_buttons = [b for row in keyboard.inline_keyboard for b in row]
            button_texts = [b.text for b in all_buttons]
            assert any("Más" in t for t in button_texts)

    @pytest.mark.asyncio
    async def test_small_batch_no_more_button(self, bot):
        """When jobs fit in one page, no ➡️ Más button needed."""
        jobs = [make_fake_job(i) for i in range(5)]

        with patch.object(bot, "get_new_jobs", return_value=jobs):
            update = make_update(chat_id=int(OWNER_CHAT_ID))
            context = make_context()
            await bot.digest_command(update, context)

            # 1 summary + 5 cards = 6 calls
            assert update.message.reply_text.call_count == 6

    @pytest.mark.asyncio
    async def test_more_button_sends_next_page(self, bot):
        """Pressing ➡️ Más should send the next batch of jobs."""
        jobs = [make_fake_job(i) for i in range(25)]

        with patch.object(bot, "get_new_jobs", return_value=jobs):
            update = make_callback_query(
                chat_id=int(OWNER_CHAT_ID),
                data="digest_page:10"  # offset=10
            )
            context = make_context()

            await bot.callback_handler(update, context)

            # Should send 10 cards via reply_text on the callback message
            assert update.callback_query.message.reply_text.call_count == PAGE_SIZE
