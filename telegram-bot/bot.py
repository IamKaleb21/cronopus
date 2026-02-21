"""
CronOpus Telegram Bot
Based on PRD V1.4 Section B - Bot de Telegram (Interfaz de Triaje)

Owner-only bot for job triage. All commands are restricted to the
configured TELEGRAM_CHAT_ID. Messages from unknown users are silently ignored.
"""
import logging
import sys
from pathlib import Path
from functools import wraps
from typing import Optional, List
from contextlib import contextmanager

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
    ApplicationBuilder,
    CommandHandler,
    CallbackQueryHandler,
    ContextTypes,
)
from sqlmodel import Session, select, create_engine

# Add backend to path for Settings
backend_path = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_path))

logger = logging.getLogger(__name__)


def get_settings():
    """Import and return backend settings."""
    from app.config import get_settings as _get_settings
    return _get_settings()


def get_session():
    """Get a database session via scrapers.database."""
    from scrapers.database import get_session as _get_session
    return _get_session()


class CronOpusBot:
    """
    Telegram bot with owner-only access control.
    
    All command handlers are protected by the auth_guard decorator,
    which silently ignores messages from non-owner chat_ids.
    """
    
    PAGE_SIZE = 10
    
    def __init__(self, token: str, owner_chat_id: str):
        self.token = token
        self.owner_chat_id = int(owner_chat_id)
        self.logger = logging.getLogger(self.__class__.__name__)
    
    @classmethod
    def from_settings(cls) -> "CronOpusBot":
        """Create a bot instance from backend Settings."""
        settings = get_settings()
        return cls(
            token=settings.telegram_bot_token,
            owner_chat_id=settings.telegram_chat_id,
        )
    
    def _is_owner(self, update: Update) -> bool:
        """Check if the message sender is the owner."""
        if not update.effective_chat:
            return False
        return update.effective_chat.id == self.owner_chat_id
    
    # ─── Job Card Formatting ──────────────────────────────────────────────

    @staticmethod
    def _escape_markdown(text: Optional[str]) -> str:
        """Escape Markdown v1 special chars so Telegram parse_mode doesn't break."""
        if not text:
            return ""
        return str(text).replace("\\", "\\\\").replace("*", "\\*").replace("_", "\\_").replace("`", "\\`").replace("[", "\\[")

    def _build_card_text(self, job) -> str:
        """Build the text content of a job card."""
        title = self._escape_markdown(job.title)
        company = self._escape_markdown(job.company)
        location = self._escape_markdown(job.location)
        salary = self._escape_markdown(job.salary) if job.salary else None
        lines = [
            f"💼 *{title}*",
            f"🏢 {company}",
            f"📍 {location}",
        ]
        if salary:
            lines.append(f"💰 {salary}")
        lines.append(f"🔗 [Ver oferta]({job.url})")
        return "\n".join(lines)
    
    def format_job_card(self, job) -> str:
        """Format a job into a Telegram message card (text only)."""
        return self._build_card_text(job)
    
    def format_job_card_with_buttons(self, job) -> tuple:
        """Format a job card with inline keyboard buttons."""
        text = self._build_card_text(job)
        keyboard = InlineKeyboardMarkup([
            [
                InlineKeyboardButton("💎 Guardar", callback_data=f"save:{job.id}"),
                InlineKeyboardButton("❌ Descartar", callback_data=f"discard:{job.id}"),
            ]
        ])
        return text, keyboard
    
    def get_new_jobs(self) -> list:
        """Query DB for jobs with status=NEW."""
        from scrapers.database import Job, JobStatus
        
        with get_session() as session:
            statement = select(Job).where(Job.status == JobStatus.NEW)
            return session.exec(statement).all()
    
    def get_status_counts(self) -> dict:
        """Get count of jobs grouped by status."""
        from scrapers.database import Job, JobStatus
        from sqlmodel import func
        
        counts = {}
        with get_session() as session:
            results = session.exec(
                select(Job.status, func.count()).group_by(Job.status)
            ).all()
            for status, count in results:
                label = status.value if hasattr(status, 'value') else str(status)
                counts[label] = count
        return counts
    
    def _update_job_status(self, job_id: str, new_status: str):
        """Update a job's status in the database."""
        from scrapers.database import Job, JobStatus
        from uuid import UUID
        
        status_map = {
            "SAVED": JobStatus.SAVED,
            "DISCARDED": JobStatus.DISCARDED,
        }
        
        with get_session() as session:
            job = session.get(Job, UUID(job_id))
            if job:
                job.status = status_map.get(new_status, JobStatus.NEW)
                session.add(job)
                session.commit()
    
    # ─── Command Handlers ────────────────────────────────────────────────
    
    async def start_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /start — welcome message."""
        if not self._is_owner(update):
            return
        
        await update.message.reply_text(
            "👋 ¡Bienvenido a *CronOpus*!\n\n"
            "Soy tu asistente de triaje de ofertas de trabajo.\n"
            "Usa /help para ver los comandos disponibles.",
            parse_mode="Markdown",
        )
    
    async def help_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /help — list available commands."""
        if not self._is_owner(update):
            return
        
        await update.message.reply_text(
            "📋 *Comandos disponibles:*\n\n"
            "/start — Mensaje de bienvenida\n"
            "/help — Lista de comandos\n"
            "/digest — Enviar ofertas nuevas\n"
            "/status — Resumen de ofertas",
            parse_mode="Markdown",
        )
    
    async def status_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /status — show job counts by status."""
        if not self._is_owner(update):
            return
        
        counts = self.get_status_counts()
        total = sum(counts.values())
        
        status_icons = {
            "NEW": "🆕",
            "SAVED": "💎",
            "DISCARDED": "❌",
            "GENERATED": "🤖",
            "APPLIED": "📨",
            "EXPIRED": "⏰",
        }
        
        lines = ["📊 *Estado de ofertas:*\n"]
        for status, icon in status_icons.items():
            count = counts.get(status, 0)
            if count > 0 or status in ("NEW", "SAVED", "DISCARDED"):
                lines.append(f"{icon} {status}: *{count}*")
        lines.append(f"\n📝 Total: *{total}*")
        
        await update.message.reply_text(
            "\n".join(lines),
            parse_mode="Markdown",
        )
    
    async def digest_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /digest — send paginated silent burst of NEW job cards."""
        if not self._is_owner(update):
            return
        
        jobs = self.get_new_jobs()
        
        if not jobs:
            await update.message.reply_text(
                "✅ No hay ofertas nuevas por ahora.",
                disable_notification=True,
            )
            return
        
        # Summary message
        await update.message.reply_text(
            f"🔔 He encontrado *{len(jobs)}* ofertas nuevas:",
            parse_mode="Markdown",
            disable_notification=True,
        )
        
        # Send first page
        await self._send_job_page(update.message, jobs, offset=0)
    
    async def _send_job_page(self, message, jobs: list, offset: int):
        """Send a page of job cards starting at offset."""
        page = jobs[offset:offset + self.PAGE_SIZE]
        has_more = (offset + self.PAGE_SIZE) < len(jobs)
        
        for i, job in enumerate(page):
            text, keyboard = self.format_job_card_with_buttons(job)
            
            # Add ➡️ Más button on the last card if there are more
            is_last = (i == len(page) - 1)
            if is_last and has_more:
                next_offset = offset + self.PAGE_SIZE
                remaining = len(jobs) - next_offset
                buttons = keyboard.inline_keyboard[0]  # existing save/discard
                more_row = [
                    InlineKeyboardButton(
                        f"➡️ Más ({remaining} restantes)",
                        callback_data=f"digest_page:{next_offset}",
                    )
                ]
                keyboard = InlineKeyboardMarkup([buttons, more_row])
            
            await message.reply_text(
                text,
                reply_markup=keyboard,
                parse_mode="Markdown",
                disable_notification=True,
                disable_web_page_preview=True,
            )
    
    async def callback_handler(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle inline button presses."""
        if not self._is_owner(update):
            return
        
        query = update.callback_query
        action, value = query.data.split(":", 1)
        
        if action == "save":
            self._update_job_status(value, "SAVED")
            await query.answer("💎 Guardado")
            await query.edit_message_text(
                f"✅ *Guardado* 💎\n\n{query.message.text if query.message else ''}",
                parse_mode="Markdown",
            )
        elif action == "discard":
            self._update_job_status(value, "DISCARDED")
            await query.answer("❌ Descartado")
            await query.edit_message_text(
                f"🗑 *Descartado* ❌\n\n~~{query.message.text if query.message else ''}~~",
                parse_mode="Markdown",
            )
        elif action == "digest_page":
            offset = int(value)
            await query.answer("⏳ Cargando...")
            jobs = self.get_new_jobs()
            await self._send_job_page(query.message, jobs, offset=offset)
    
    # ─── Application Builder ─────────────────────────────────────────────
    
    def build_application(self):
        """Build and configure the Telegram application."""
        app = ApplicationBuilder().token(self.token).build()
        
        app.add_handler(CommandHandler("start", self.start_command))
        app.add_handler(CommandHandler("help", self.help_command))
        app.add_handler(CommandHandler("status", self.status_command))
        app.add_handler(CommandHandler("digest", self.digest_command))
        app.add_handler(CallbackQueryHandler(self.callback_handler))
        
        return app
    
    def run_polling(self):
        """Start long-polling. Blocks until interrupted."""
        self.logger.info(f"Starting bot (owner_chat_id={self.owner_chat_id})...")
        app = self.build_application()
        app.run_polling(drop_pending_updates=True)
