"""
Tests for sanitize_latex() (Task 5.2). TDD: validate escaping of %, $, _, &, # without breaking commands.
"""
import pytest


class TestSanitizeLatex:
    """sanitize_latex escapes special chars and preserves control sequences."""

    def test_escapes_percent_in_text(self):
        from app.services.latex_sanitizer import sanitize_latex
        result = sanitize_latex("100% done")
        assert "\\%" in result
        assert result == "100\\% done"

    def test_does_not_double_escape(self):
        from app.services.latex_sanitizer import sanitize_latex
        result = sanitize_latex(r"100\% done")
        assert result == r"100\% done"

    def test_escapes_dollar_underscore_ampersand_hash(self):
        from app.services.latex_sanitizer import sanitize_latex
        # $ is not escaped (template uses $ for math mode); _ and & are escaped
        # # is not escaped when followed by digit (#1, #2 preserve macro params in preamble)
        result = sanitize_latex("Price $10_score & #1")
        assert "\\_" in result
        assert "\\&" in result
        assert result == "Price $10\\_score \\& #1"
        # # without digit is escaped
        assert sanitize_latex("item # three") == "item \\# three"

    def test_preserves_control_sequences(self):
        from app.services.latex_sanitizer import sanitize_latex
        s1 = r"\section{Intro}"
        s2 = r"\begin{document}"
        assert sanitize_latex(s1) == s1
        assert sanitize_latex(s2) == s2

    def test_preserves_already_escaped_specials(self):
        from app.services.latex_sanitizer import sanitize_latex
        result = sanitize_latex(r"\$ \& \#")
        assert result == r"\$ \& \#"

    def test_empty_string(self):
        from app.services.latex_sanitizer import sanitize_latex
        assert sanitize_latex("") == ""

    def test_no_special_chars(self):
        from app.services.latex_sanitizer import sanitize_latex
        assert sanitize_latex("Hello world") == "Hello world"


class TestSanitizeStringForLatex:
    """sanitize_string_for_latex escapes special chars in data strings."""

    def test_escapes_percent(self):
        from app.services.latex_sanitizer import sanitize_string_for_latex
        assert sanitize_string_for_latex("100% done") == "100\\% done"

    def test_escapes_underscore_ampersand_hash(self):
        from app.services.latex_sanitizer import sanitize_string_for_latex
        result = sanitize_string_for_latex("data_ml score & item # three")
        assert "\\_" in result
        assert "\\&" in result
        assert "\\#" in result
        assert result == "data\\_ml score \\& item \\# three"

    def test_preserves_hash_followed_by_digit(self):
        from app.services.latex_sanitizer import sanitize_string_for_latex
        assert sanitize_string_for_latex("item #1") == "item #1"

    def test_no_double_escape(self):
        from app.services.latex_sanitizer import sanitize_string_for_latex
        assert sanitize_string_for_latex(r"100\% done") == r"100\% done"

    def test_empty_string(self):
        from app.services.latex_sanitizer import sanitize_string_for_latex
        assert sanitize_string_for_latex("") == ""

    def test_no_special_chars(self):
        from app.services.latex_sanitizer import sanitize_string_for_latex
        assert sanitize_string_for_latex("Hello world") == "Hello world"


class TestSanitizeDictForLatex:
    """sanitize_dict_for_latex recursively sanitizes strings in dicts/lists."""

    def test_recursively_sanitizes_strings(self):
        from app.services.latex_sanitizer import sanitize_dict_for_latex
        data = {"a": "100%", "b": {"c": "data_ml"}, "d": ["x & y"]}
        result = sanitize_dict_for_latex(data)
        assert result["a"] == "100\\%"
        assert result["b"]["c"] == "data\\_ml"
        assert result["d"][0] == "x \\& y"

    def test_leaves_non_strings_unchanged(self):
        from app.services.latex_sanitizer import sanitize_dict_for_latex
        data = {"n": 42, "b": True, "none": None}
        result = sanitize_dict_for_latex(data)
        assert result["n"] == 42
        assert result["b"] is True
        assert result["none"] is None

    def test_empty_containers(self):
        from app.services.latex_sanitizer import sanitize_dict_for_latex
        assert sanitize_dict_for_latex({}) == {}
        assert sanitize_dict_for_latex([]) == []
        assert sanitize_dict_for_latex("") == ""
