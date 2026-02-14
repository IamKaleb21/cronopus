# CronOpus Backend (FastAPI + Tectonic). Task 5.3.
FROM python:3.12-slim

# Install Tectonic: binary needs libgraphite2; download and put in PATH
ARG TECTONIC_VERSION=0.15.0
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates libgraphite2-3 \
    && curl -sL "https://github.com/tectonic-typesetting/tectonic/releases/download/tectonic%40${TECTONIC_VERSION}/tectonic-${TECTONIC_VERSION}-x86_64-unknown-linux-gnu.tar.gz" | tar xz -C /usr/local/bin \
    && apt-get purge -y curl && apt-get autoremove -y && rm -rf /var/lib/apt/lists/* \
    && tectonic --version \
    && echo "Pre-cache Tectonic default bundle (first compile downloads it)" \
    && printf '\\documentclass{article}\n\\begin{document}x\n\\end{document}\n' > /tmp/pre.tex \
    && tectonic --untrusted /tmp/pre.tex && rm -f /tmp/pre.tex /tmp/pre.pdf /tmp/pre.log /tmp/pre.aux 2>/dev/null; true

WORKDIR /app

# Install uv for dependency management (repo convention)
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

COPY requirements.txt .
RUN uv pip install --system --no-cache -r requirements.txt

COPY . .

EXPOSE 8000
ENTRYPOINT ["sh", "entrypoint.sh"]
