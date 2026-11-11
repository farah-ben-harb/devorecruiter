FROM python:3.11.18-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt constraints.txt ./
# Resolve Torch only from the dedicated CPU index, then use PyPI for the application graph.
RUN pip install --no-cache-dir --upgrade \
        "pip==26.1.2" \
        "setuptools==83.0.0" \
        "wheel==0.47.0" \
    && pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu torch==2.13.0 \
    && pip install --no-cache-dir -r requirements.txt \
    && pip check

COPY app ./app

RUN useradd --create-home --shell /usr/sbin/nologin appuser \
    && mkdir -p /data/chroma \
    && chown -R appuser:appuser /data

ENV CHROMA_PERSIST_DIRECTORY=/data/chroma

USER appuser

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
