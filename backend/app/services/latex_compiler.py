"""
LaTeX compiler via Tectonic (Task 5.3). Temp file -> tectonic -> PDF bytes.
Callers must sanitize raw LaTeX before passing; Jinja flow sanitizes profile/cv at render time.
"""
import shutil
import subprocess
import tempfile
from pathlib import Path

COMPILE_TIMEOUT = 60
TEX_BASENAME = "document"


class CompilationError(Exception):
    """Raised when Tectonic compilation fails; message is the error log."""

    def __init__(self, log: str):
        self.log = log
        super().__init__(log)


def compile_latex_to_pdf(content: str) -> bytes:
    """
    Compile LaTeX source to PDF bytes. Writes temp .tex, runs Tectonic.
    Callers must sanitize raw LaTeX before passing (Jinja flow sanitizes at render).
    Returns PDF bytes on success. Raises CompilationError(log) on failure, or
    subprocess.TimeoutExpired on timeout (after COMPILE_TIMEOUT seconds).
    """
    tmpdir = tempfile.mkdtemp()
    try:
        tex_path = Path(tmpdir) / f"{TEX_BASENAME}.tex"
        tex_path.write_text(content, encoding="utf-8")
        result = subprocess.run(
            ["tectonic", "--untrusted", f"{TEX_BASENAME}.tex"],
            cwd=tmpdir,
            capture_output=True,
            text=True,
            timeout=COMPILE_TIMEOUT,
        )
        if result.returncode != 0:
            log_parts = [result.stderr or ""]
            log_file = Path(tmpdir) / f"{TEX_BASENAME}.log"
            if log_file.exists():
                log_parts.append(log_file.read_text(encoding="utf-8", errors="replace"))
            raise CompilationError("\n".join(log_parts).strip() or "Compilation failed")
        pdf_path = Path(tmpdir) / f"{TEX_BASENAME}.pdf"
        if not pdf_path.exists():
            raise CompilationError("Tectonic did not produce a PDF")
        return pdf_path.read_bytes()
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)
