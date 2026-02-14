"""
Tests for Notification System (TDD - RED phase)
Phase 3.2: Ráfaga Silenciosa
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch


OWNER_CHAT_ID = "123456789"
FAKE_TOKEN = "0000000000:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"


def make_fake_job(title="Dev Python", company="TechCorp", location="Lima",
                  salary="S/3000", url="https://example.com/job/1", status="NEW"):
    """Create a fake Job-like object."""
    job = MagicMock()
    job.title = title
    job.company = company
    job.location = location
    job.salary = salary
    job.url = url
    job.status = status
    job.id = "fake-uuid-1"
    return job


def make_update(chat_id: int, text: str = "/digest"):
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


# ─── Tests ───────────────────────────────────────────────────────────────────

class TestFormatJobCard:
    """Tests for job card formatting."""

    def test_format_job_card(self, bot):
        """Card should contain title, company, location, salary, and url."""
        job = make_fake_job(
            title="Desarrollador Python",
            company="TechCorp",
            location="Lima",
            salary="S/3000 - S/5000",
            url="https://example.com/job/1",
        )
        card = bot.format_job_card(job)

        assert "Desarrollador Python" in card
        assert "TechCorp" in card
        assert "Lima" in card
        assert "S/3000" in card
        assert "https://example.com/job/1" in card

    def test_format_job_card_no_salary(self, bot):
        """When salary is None, the salary line should be omitted."""
        job = make_fake_job(salary=None)
        card = bot.format_job_card(job)

        assert "salario" not in card.lower()
        assert "S/" not in card
        # But still has title and company
        assert job.title in card
        assert job.company in card


class TestGetNewJobs:
    """Tests for querying NEW jobs from DB."""

    def test_get_new_jobs_returns_list(self, bot):
        """get_new_jobs should return a list of Job objects with status NEW."""
        fake_jobs = [make_fake_job(status="NEW"), make_fake_job(status="NEW")]

        with patch("telegram_bot.bot.get_session") as mock_session:
            session = MagicMock()
            mock_session.return_value.__enter__ = MagicMock(return_value=session)
            mock_session.return_value.__exit__ = MagicMock(return_value=False)
            session.exec.return_value.all.return_value = fake_jobs

            result = bot.get_new_jobs()

        assert len(result) == 2


class TestDigestCommand:
    """Tests for the /digest command."""

    @pytest.mark.asyncio
    async def test_digest_sends_summary_then_cards(self, bot):
        """Digest should send summary message, then one card per job."""
        jobs = [make_fake_job(title="Job A"), make_fake_job(title="Job B")]

        with patch.object(bot, "get_new_jobs", return_value=jobs):
            update = make_update(chat_id=int(OWNER_CHAT_ID))
            context = make_context()

            await bot.digest_command(update, context)

            # Summary + 2 cards = 3 calls
            assert update.message.reply_text.call_count == 3

            # First call is the summary
            summary = update.message.reply_text.call_args_list[0][0][0]
            assert "2" in summary  # "2 ofertas"

    @pytest.mark.asyncio
    async def test_digest_no_new_jobs(self, bot):
        """When there are no new jobs, send a 'no new jobs' message."""
        with patch.object(bot, "get_new_jobs", return_value=[]):
            update = make_update(chat_id=int(OWNER_CHAT_ID))
            context = make_context()

            await bot.digest_command(update, context)

            update.message.reply_text.assert_called_once()
            msg = update.message.reply_text.call_args[0][0]
            assert "no hay" in msg.lower() or "0" in msg

    @pytest.mark.asyncio
    async def test_digest_silent_notifications(self, bot):
        """All digest messages should be sent with disable_notification=True."""
        jobs = [make_fake_job()]

        with patch.object(bot, "get_new_jobs", return_value=jobs):
            update = make_update(chat_id=int(OWNER_CHAT_ID))
            context = make_context()

            await bot.digest_command(update, context)

            # Every call should have disable_notification=True
            for call in update.message.reply_text.call_args_list:
                kwargs = call[1]
                assert kwargs.get("disable_notification") is True
