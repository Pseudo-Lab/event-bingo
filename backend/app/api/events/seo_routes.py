import html
import os
import re
from datetime import datetime
from zoneinfo import ZoneInfo

import httpx
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import HTMLResponse

from core.db import AsyncSessionDepends
from models.event import Event


event_seo_router = APIRouter(tags=["event-seo"])

SITE_ORIGIN = os.getenv("PUBLIC_SITE_ORIGIN", "https://bingo.pseudolab-devfactory.com").rstrip("/")
DEFAULT_OG_IMAGE_URL = os.getenv(
    "PUBLIC_OG_IMAGE_URL",
    f"{SITE_ORIGIN}/images/hero-networking.jpg",
)
FRONTEND_INDEX_URL_CANDIDATES = [
    value.strip()
    for value in (
        os.getenv("FRONTEND_INDEX_URL"),
        os.getenv("FRONTEND_ORIGIN"),
        "http://event-bingo-frontend/",
        "http://frontend/",
    )
    if value and value.strip()
]


def format_event_datetime(value: datetime) -> str:
    try:
        localized_value = (
            value.replace(tzinfo=ZoneInfo("Asia/Seoul"))
            if value.tzinfo is None
            else value.astimezone(ZoneInfo("Asia/Seoul"))
        )
        return localized_value.strftime("%Y.%m.%d %H:%M")
    except Exception:
        return value.isoformat()


def build_event_seo_description(event: Event) -> str:
    date_label = format_event_datetime(event.start_time)
    return (
        f"{event.name} 참가자를 위한 Bingo Networking 페이지입니다. "
        f"{event.location}에서 {date_label}에 진행되는 행사에서 키워드를 교환하며 네트워킹하세요."
    )


def replace_head_tag(document: str, pattern: str, replacement: str) -> str:
    next_document, count = re.subn(pattern, replacement, document, count=1, flags=re.IGNORECASE)
    if count > 0:
        return next_document

    return document.replace("</head>", f"    {replacement}\n  </head>", 1)


def render_event_share_html(index_html: str, event: Event) -> str:
    title = f"{event.name} | Bingo Networking"
    description = build_event_seo_description(event)
    canonical_url = f"{SITE_ORIGIN}/event/{event.slug}"
    escaped_title = html.escape(title, quote=True)
    escaped_description = html.escape(description, quote=True)
    escaped_canonical_url = html.escape(canonical_url, quote=True)
    escaped_image_url = html.escape(DEFAULT_OG_IMAGE_URL, quote=True)
    escaped_image_alt = html.escape(f"{event.name} Bingo Networking 공유 이미지", quote=True)

    replacements = [
        (r"<title>.*?</title>", f"<title>{escaped_title}</title>"),
        (
            r'<meta\s+name="description"\s+content="[^"]*"\s*/?>',
            f'<meta name="description" content="{escaped_description}" />',
        ),
        (
            r'<meta\s+property="og:url"\s+content="[^"]*"\s*/?>',
            f'<meta property="og:url" content="{escaped_canonical_url}" />',
        ),
        (
            r'<meta\s+property="og:title"\s+content="[^"]*"\s*/?>',
            f'<meta property="og:title" content="{escaped_title}" />',
        ),
        (
            r'<meta\s+property="og:description"\s+content="[^"]*"\s*/?>',
            f'<meta property="og:description" content="{escaped_description}" />',
        ),
        (
            r'<meta\s+property="og:image"\s+content="[^"]*"\s*/?>',
            f'<meta property="og:image" content="{escaped_image_url}" />',
        ),
        (
            r'<meta\s+property="og:image:alt"\s+content="[^"]*"\s*/?>',
            f'<meta property="og:image:alt" content="{escaped_image_alt}" />',
        ),
        (
            r'<meta\s+name="twitter:title"\s+content="[^"]*"\s*/?>',
            f'<meta name="twitter:title" content="{escaped_title}" />',
        ),
        (
            r'<meta\s+name="twitter:description"\s+content="[^"]*"\s*/?>',
            f'<meta name="twitter:description" content="{escaped_description}" />',
        ),
        (
            r'<meta\s+name="twitter:image"\s+content="[^"]*"\s*/?>',
            f'<meta name="twitter:image" content="{escaped_image_url}" />',
        ),
        (
            r'<link\s+rel="canonical"\s+href="[^"]*"\s*/?>',
            f'<link rel="canonical" href="{escaped_canonical_url}" />',
        ),
    ]

    rendered_html = index_html
    for pattern, replacement in replacements:
        rendered_html = replace_head_tag(rendered_html, pattern, replacement)

    return rendered_html


async def fetch_frontend_index_html() -> str:
    errors: list[str] = []
    async with httpx.AsyncClient(timeout=3.0) as client:
        for base_url in FRONTEND_INDEX_URL_CANDIDATES:
            url = base_url if base_url.endswith("/") else f"{base_url}/"
            try:
                response = await client.get(url)
                response.raise_for_status()
                return response.text
            except httpx.HTTPError as error:
                errors.append(f"{url}: {error}")

    raise RuntimeError("; ".join(errors) or "frontend index URL is not configured")


@event_seo_router.get("/event/{event_slug}", include_in_schema=False)
async def get_event_share_page(
    event_slug: str,
    db: AsyncSessionDepends,
):
    try:
        index_html = await fetch_frontend_index_html()
    except RuntimeError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"프론트엔드 HTML을 불러오지 못했습니다: {error}",
        ) from error

    event = await Event.get_by_slug(db, event_slug.strip().lower())
    if not event:
        return HTMLResponse(index_html)

    return HTMLResponse(render_event_share_html(index_html, event))
