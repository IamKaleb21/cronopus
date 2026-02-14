"""
Tests for Inline Actions (TDD - RED phase)
Phase 3.3: 💎 Guardar / ❌ Descartar buttons on job cards
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch


OWNER_CHAT_ID = "123456789"
FAKE_TOKEN = "0000000000:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
FAKE_JOB_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"


def make_fake_job(title="Dev Python", company="TechCorp", location="Lima",
                  salary="S/3000", url="https://example.com/job/1", status="NEW"):
    job = MagicMock()
    job.title = title
    job.company = company
    job.location = location
    job.salary = salary
    job.url = url
    job.status = status
    job.id = FAKE_JOB_ID
    return job


def make_callback_query(chat_id: int, data: str):
    """Create a mock callback_query Update."""
    update = MagicMock()
    update.effective_chat = MagicMock()
    update.effective_chat.id = chat_id
    update.callback_query = MagicMock()
    update.callback_query.data = data
    update.callback_query.answer = AsyncMock()
    update.callback_query.edit_message_text = AsyncMock()
    return update


def make_context():
    return MagicMock()


@pytest.fixture
def bot():
    from telegram_bot.bot import CronOpusBot
    return CronOpusBot(token=FAKE_TOKEN, owner_chat_id=OWNER_CHAT_ID)


# ─── Tests ───────────────────────────────────────────────────────────────────

class TestInlineKeyboard:
    """Tests for inline keyboard on job cards."""

    def test_job_card_has_inline_keyboard(self, bot):
        """format_job_card should return a tuple: (text, InlineKeyboardMarkup)."""
        job = make_fake_job()
        result = bot.format_job_card_with_buttons(job)

        # Should return tuple of (text, keyboard)
        assert isinstance(result, tuple)
        text, keyboard = result
        assert "Dev Python" in text
        assert keyboard is not None

    def test_inline_keyboard_has_two_buttons(self, bot):
        """Keyboard should have 💎 Guardar and ❌ Descartar buttons."""
        job = make_fake_job()
        _, keyboard = bot.format_job_card_with_buttons(job)

        buttons = keyboard.inline_keyboard[0]
        assert len(buttons) == 2

        button_texts = [b.text for b in buttons]
        assert any("Guardar" in t for t in button_texts)
        assert any("Descartar" in t for t in button_texts)

    def test_callback_data_contains_job_id(self, bot):
        """Button callback_data should encode action + job_id."""
        job = make_fake_job()
        _, keyboard = bot.format_job_card_with_buttons(job)

        buttons = keyboard.inline_keyboard[0]
        for button in buttons:
            assert FAKE_JOB_ID in button.callback_data


class TestCallbackHandler:
    """Tests for callback_query handler."""

    @pytest.mark.asyncio
    async def test_save_callback_updates_status(self, bot):
        """Pressing 💎 should update job status to SAVED."""
        update = make_callback_query(
            chat_id=int(OWNER_CHAT_ID),
            data=f"save:{FAKE_JOB_ID}"
        )
        context = make_context()

        with patch.object(bot, "_update_job_status") as mock_update:
            await bot.callback_handler(update, context)

            mock_update.assert_called_once_with(FAKE_JOB_ID, "SAVED")
            update.callback_query.answer.assert_called_once()

    @pytest.mark.asyncio
    async def test_discard_callback_updates_status(self, bot):
        """Pressing ❌ should update job status to DISCARDED."""
        update = make_callback_query(
            chat_id=int(OWNER_CHAT_ID),
            data=f"discard:{FAKE_JOB_ID}"
        )
        context = make_context()

        with patch.object(bot, "_update_job_status") as mock_update:
            await bot.callback_handler(update, context)

            mock_update.assert_called_once_with(FAKE_JOB_ID, "DISCARDED")

    @pytest.mark.asyncio
    async def test_callback_edits_message(self, bot):
        """After action, the message should be edited with visual feedback."""
        update = make_callback_query(
            chat_id=int(OWNER_CHAT_ID),
            data=f"save:{FAKE_JOB_ID}"
        )
        context = make_context()

        with patch.object(bot, "_update_job_status"):
            await bot.callback_handler(update, context)

            update.callback_query.edit_message_text.assert_called_once()
            edited_text = update.callback_query.edit_message_text.call_args[0][0]
            # Should have a visual indicator of the action
            assert "💎" in edited_text or "Guardado" in edited_text or "✅" in edited_text

    @pytest.mark.asyncio
    async def test_callback_blocks_stranger(self, bot):
        """Callback from non-owner should be ignored."""
        update = make_callback_query(
            chat_id=999999999,
            data=f"save:{FAKE_JOB_ID}"
        )
        context = make_context()

        with patch.object(bot, "_update_job_status") as mock_update:
            await bot.callback_handler(update, context)

            mock_update.assert_not_called()
