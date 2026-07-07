FROM python:3.12-slim

WORKDIR /app

ENV PIP_DEFAULT_TIMEOUT=1000 \
    PIP_RETRIES=10 \
    ARGOS_DEVICE_TYPE=cpu \
    XDG_DATA_HOME=/opt/compai-data

COPY requirements.txt .
RUN mkdir -p /opt/compai-data
RUN pip install --no-cache-dir --timeout 1000 --retries 10 --index-url https://download.pytorch.org/whl/cpu torch==2.3.1+cpu
RUN pip install --no-cache-dir --timeout 1000 --retries 10 -r requirements.txt
RUN python -c "from argostranslate import package; package.update_package_index(); pkg = next((p for p in package.get_available_packages() if p.from_code == 'es' and p.to_code == 'en'), None); assert pkg is not None, 'Argos es->en model is not available'; package.install_from_path(pkg.download())"

COPY . .

RUN groupadd --system compai && useradd --system --gid compai --home /app compai \
    && chown -R compai:compai /app /opt/compai-data

USER compai

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=3)"

CMD ["sh", "-c", "alembic upgrade head && exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers --forwarded-allow-ips='*'"]
