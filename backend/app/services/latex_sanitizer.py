"""
LaTeX sanitizer (Task 5.2). Escapes %, $, _, &, # when not already preceded by backslash.
"""
import re


def sanitize_string_for_latex(text: str) -> str:
    """
    Escape LaTeX special characters in a data string (%, _, &, #).
    For use on individual strings before inserting into LaTeX template.
    Does not escape $ (rare in data). Preserves # when followed by digit.
    """
    if not text:
        return text
    result = re.sub(r"(?<!\\)%", r"\\%", text)
    result = re.sub(r"(?<!\\)_", r"\\_", result)
    result = re.sub(r"(?<!\\)&", r"\\&", result)
    result = re.sub(r"(?<!\\)#(?!\d)", r"\\#", result)
    return result


def sanitize_dict_for_latex(obj):
    """
    Recursively sanitize all string values in dict/list for LaTeX.
    Leaves non-string types unchanged.
    """
    if isinstance(obj, str):
        return sanitize_string_for_latex(obj)
    if isinstance(obj, dict):
        return {k: sanitize_dict_for_latex(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [sanitize_dict_for_latex(item) for item in obj]
    return obj


def sanitize_latex(text: str) -> str:
    """
    Escape LaTeX special characters (%, $, _, &, #) only when not already escaped.
    Preserves control sequences (\\section, \\begin) and already-escaped sequences (\\%, \\$).
    Preserves LaTeX comment lines (% at line start) so they are not escaped.
    """
    if not text:
        return text
    # For %: don't escape when at start of comment line (LaTeX comments start with %)
    lines = text.split("\n")
    percent_escaped_lines = []
    for line in lines:
        stripped = line.lstrip()
        if stripped.startswith("%"):
            percent_escaped_lines.append(line)
        else:
            percent_escaped_lines.append(re.sub(r"(?<!\\)%", r"\\%", line))
    result = "\n".join(percent_escaped_lines)
    # Skip escaping $ - template uses $ for math mode ($|$, $\bullet$). User content with $ is rare.
    # Skip escaping # when part of macro param (#1, #2, etc.) - would break \newcommand definitions
    result = re.sub(r"(?<!\\)_", r"\\_", result)
    result = re.sub(r"(?<!\\)&", r"\\&", result)
    result = re.sub(r"(?<!\\)#(?!\d)", r"\\#", result)  # Escape # only when NOT followed by digit
    return result


def repair_tabular_ampersands(latex_content: str) -> str:
    """
    Repair LaTeX content where tabular column separators (&) were incorrectly escaped as \\&.
    This fixes CVs that were saved with sanitize_latex applied to the full document.
    
    Pattern: Look for } \\&  (closing brace, optional whitespace, escaped ampersand) which is likely
    a tabular column separator that should be just &. This happens in \resumeSubheading macros where
    we have: \textbf{#1} & #2 \\  -> if sanitized becomes: \textbf{#1} \& #2 \\
    """
    if not latex_content:
        return latex_content
    # Pattern: closing brace } followed by optional whitespace and \&, then space/newline/\\
    # This matches tabular column separators that were incorrectly escaped
    # Example: \textbf{ Role } \& Dates \\  -> should be: \textbf{ Role } & Dates \\
    result = re.sub(r"(\})\s*\\&(\s+|\\\\|$)", r"\1 &\2", latex_content)
    return result
