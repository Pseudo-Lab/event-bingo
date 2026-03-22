# syntax=docker/dockerfile:1.7
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt ./
RUN --mount=type=cache,target=/root/.cache/pip pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["/bin/sh", "-c", "alembic upgrade head && python app/start.py"]
