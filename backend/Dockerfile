# syntax=docker/dockerfile:1.7
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt ./
RUN --mount=type=cache,target=/root/.cache/pip \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    pip install -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["python", "app/start.py"]
