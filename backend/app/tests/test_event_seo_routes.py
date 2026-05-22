from datetime import datetime
from types import SimpleNamespace
from zoneinfo import ZoneInfo

from api.events.seo_routes import render_event_share_html


def test_render_event_share_html_injects_event_metadata():
    event = SimpleNamespace(
        name="AI 네트워킹 데이",
        slug="ai-networking-day",
        location="서울 컨벤션 센터",
        start_time=datetime(2026, 6, 1, 19, 0, tzinfo=ZoneInfo("Asia/Seoul")),
    )
    index_html = """<!doctype html>
<html lang="ko">
  <head>
    <title>Bingo Networking | DevFactory</title>
    <meta name="description" content="기본 설명" />
    <meta property="og:url" content="https://bingo.pseudolab-devfactory.com/" />
    <meta property="og:title" content="Bingo Networking | DevFactory" />
    <meta property="og:description" content="기본 OG 설명" />
    <meta property="og:image" content="https://bingo.pseudolab-devfactory.com/images/hero-networking.jpg" />
    <meta property="og:image:alt" content="기본 이미지" />
    <meta name="twitter:title" content="Bingo Networking | DevFactory" />
    <meta name="twitter:description" content="기본 Twitter 설명" />
    <meta name="twitter:image" content="https://bingo.pseudolab-devfactory.com/images/hero-networking.jpg" />
    <link rel="canonical" href="https://bingo.pseudolab-devfactory.com/" />
  </head>
  <body><div id="root"></div></body>
</html>"""

    rendered_html = render_event_share_html(index_html, event)

    assert "<title>AI 네트워킹 데이 | Bingo Networking</title>" in rendered_html
    assert 'content="https://bingo.pseudolab-devfactory.com/event/ai-networking-day"' in rendered_html
    assert "서울 컨벤션 센터" in rendered_html
    assert "2026.06.01 19:00" in rendered_html
    assert "AI 네트워킹 데이 Bingo Networking 공유 이미지" in rendered_html


def test_render_event_share_html_escapes_event_values():
    event = SimpleNamespace(
        name='행사 "A" <script>',
        slug="event-a",
        location='장소 "B"',
        start_time=datetime(2026, 6, 1, 19, 0, tzinfo=ZoneInfo("Asia/Seoul")),
    )
    index_html = "<html><head><title>기본</title></head><body></body></html>"

    rendered_html = render_event_share_html(index_html, event)

    assert "행사 &quot;A&quot; &lt;script&gt; | Bingo Networking" in rendered_html
    assert 'content="행사 &quot;A&quot; &lt;script&gt;' in rendered_html
    assert "<script>" not in rendered_html
