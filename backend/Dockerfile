FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_CACHE_DIR=/tmp/uv-cache \
    UV_LINK_MODE=copy \
    PATH="/app/.venv/bin:$PATH"

COPY pyproject.toml uv.lock README.md ./

RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir uv==0.11.19 \
    && uv sync --frozen --no-dev --no-install-project \
    && rm -rf "$UV_CACHE_DIR"

COPY src ./src

RUN uv sync --frozen --no-dev \
    && rm -rf "$UV_CACHE_DIR"

CMD ["sh", "-c", "uvicorn sma_extreme_heat_backend.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
