"""
Tests for latex_compiler service (Task 5.3). TDD: write tests first, then implement.
Unit tests mock subprocess; integration tests run Tectonic for real (skipped if not installed).
"""
import shutil
import subprocess
from pathlib import Path
from unittest.mock import patch

import pytest

TECTONIC_AVAILABLE = shutil.which("tectonic") is not None


class TestCompileLatexToPdf:
    """compile_latex_to_pdf returns PDF bytes or raises CompilationError."""

    def test_returns_pdf_bytes_on_success(self):
        from app.services.latex_compiler import compile_latex_to_pdf

        def mock_run(*args, **kwargs):
            cwd = kwargs.get("cwd")
            if cwd:
                (Path(cwd) / "document.pdf").write_bytes(b"%PDF-1.4 fake content")
            return subprocess.CompletedProcess(args=args, returncode=0, stdout="", stderr="")

        with patch("app.services.latex_compiler.subprocess.run", side_effect=mock_run):
            result = compile_latex_to_pdf(r"\documentclass{article}\n\begin{document}Hi\n\end{document}")
        assert isinstance(result, bytes)
        assert result.startswith(b"%PDF")

    def test_raises_compilation_error_with_log_on_failure(self):
        from app.services.latex_compiler import compile_latex_to_pdf, CompilationError

        def mock_run(*args, **kwargs):
            return subprocess.CompletedProcess(
                args=args, returncode=1, stdout="", stderr="! LaTeX Error: undefined control sequence."
            )

        with patch("app.services.latex_compiler.subprocess.run", side_effect=mock_run):
            with pytest.raises(CompilationError) as exc_info:
                compile_latex_to_pdf(r"\documentclass{article}\n\begin{document}\invalidcmd\n\end{document}")
        assert "undefined control sequence" in str(exc_info.value)

    def test_passes_content_through_without_internal_sanitization(self):
        """compile_latex_to_pdf does NOT sanitize; callers must sanitize raw LaTeX."""
        from app.services.latex_compiler import compile_latex_to_pdf

        written_content = []

        def mock_run(*args, **kwargs):
            cwd = kwargs.get("cwd")
            if cwd:
                tex_path = Path(cwd) / "document.tex"
                if tex_path.exists():
                    written_content.append(tex_path.read_text())
                (Path(cwd) / "document.pdf").write_bytes(b"%PDF-1.4")
            return subprocess.CompletedProcess(args=args, returncode=0, stdout="", stderr="")

        with patch("app.services.latex_compiler.subprocess.run", side_effect=mock_run):
            result = compile_latex_to_pdf(r"\documentclass{article}\begin{document}Hi 100%\end{document}")
        assert isinstance(result, bytes)
        assert result.startswith(b"%PDF")
        assert len(written_content) == 1
        assert "100%" in written_content[0], "Content passed through as-is; no internal sanitization"

    def test_raises_on_timeout(self):
        from app.services.latex_compiler import compile_latex_to_pdf

        def mock_run(*args, **kwargs):
            raise subprocess.TimeoutExpired(cmd=args[0], timeout=10)

        with patch("app.services.latex_compiler.subprocess.run", side_effect=mock_run):
            with pytest.raises(subprocess.TimeoutExpired):
                compile_latex_to_pdf(r"\documentclass{article}\n\begin{document}Hi\n\end{document}")


@pytest.mark.skipif(not TECTONIC_AVAILABLE, reason="Tectonic not installed (run in Docker or install tectonic)")
class TestCompileLatexToPdfWithTectonic:
    """Integration tests: real Tectonic run. Validate that we actually get a PDF and proper errors."""

    MINIMAL_VALID_LATEX = r"""
\documentclass{article}
\begin{document}
Hello world.
\end{document}
""".strip()

    def test_tectonic_compiles_valid_latex_to_pdf(self):
        from app.services.latex_compiler import compile_latex_to_pdf

        result = compile_latex_to_pdf(self.MINIMAL_VALID_LATEX)
        assert isinstance(result, bytes)
        assert result.startswith(b"%PDF"), "Output should be a PDF file"
        assert len(result) > 200, "PDF should have meaningful content"

    def test_tectonic_raises_compilation_error_for_invalid_latex(self):
        from app.services.latex_compiler import compile_latex_to_pdf, CompilationError

        invalid_latex = r"\documentclass{article}\begin{document}\invalidnonexistentcmd\end{document}"
        with pytest.raises(CompilationError) as exc_info:
            compile_latex_to_pdf(invalid_latex)
        log = str(exc_info.value)
        assert "invalid" in log.lower() or "undefined" in log.lower() or "error" in log.lower()
