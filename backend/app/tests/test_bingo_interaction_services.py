from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from api.bingo.bingo_interaction.services import (
    CreateBingoInteraction,
    GetUserAllInteractions,
)
from models.bingo.bingo_boards import BingoBoards
from models.bingo.bingo_interaction import BingoInteraction
from models.user import BingoUser


class FakeScalarResult:
    def __init__(self, values):
        self._values = values

    def all(self):
        return self._values


class FakeExecuteResult:
    def __init__(self, values):
        self._values = values

    def scalars(self):
        return FakeScalarResult(self._values)


@pytest.mark.asyncio
async def test_create_bingo_interaction_rejects_duplicate_direction(monkeypatch):
    async def fake_has_directional_interaction(
        cls,
        session,
        *,
        send_user_id: int,
        receive_user_id: int,
    ) -> bool:
        assert send_user_id == 1
        assert receive_user_id == 2
        return True

    monkeypatch.setattr(
        BingoInteraction,
        "has_directional_interaction",
        classmethod(fake_has_directional_interaction),
    )

    service = CreateBingoInteraction(AsyncMock())

    response = await service.execute('["AI"]', 1, 2)

    assert response.ok is False
    assert "이미 동일한 참가자" in response.message


@pytest.mark.asyncio
async def test_create_bingo_interaction_updates_board_and_creates_record(monkeypatch):
    board = SimpleNamespace(
        user_id=2,
        board_data={
            "0": {"value": "AI", "status": 0, "selected": 0},
            "1": {"value": "ML", "status": 0, "selected": 0},
        },
        user_interaction_count=0,
        bingo_count=0,
    )
    interaction = SimpleNamespace(
        interaction_id=13,
        word_id_list='["AI"]',
        send_user_id=1,
        receive_user_id=2,
        created_at=datetime(2026, 3, 19, 10, 0, tzinfo=timezone.utc),
    )

    async def fake_has_directional_interaction(
        cls,
        session,
        *,
        send_user_id: int,
        receive_user_id: int,
    ) -> bool:
        assert send_user_id == 1
        assert receive_user_id == 2
        return False

    async def fake_get_user_by_id(cls, session, user_id: int):
        return SimpleNamespace(user_id=user_id, user_name=f"user-{user_id}")

    async def fake_get_board_by_userid(cls, session, user_id: int):
        assert user_id == 2
        return board

    async def fake_get_user_selected_words(cls, session, user_id: int):
        assert user_id == 1
        return ["AI"]

    async def fake_update_board_by_userid(cls, session, user_id: int, board_data: dict):
        assert user_id == 2
        assert board_data["0"]["status"] == 1
        assert board_data["0"]["interaction_id"] == 1
        return board

    async def fake_update_bingo_count(cls, session, user_id: int):
        assert user_id == 2
        board.bingo_count = 1
        return board

    async def fake_create(cls, session, word_id_list: str, send_user_id: int, receive_user_id: int):
        assert word_id_list == '["AI"]'
        assert send_user_id == 1
        assert receive_user_id == 2
        return interaction

    monkeypatch.setattr(
        BingoInteraction,
        "has_directional_interaction",
        classmethod(fake_has_directional_interaction),
    )
    monkeypatch.setattr(BingoUser, "get_user_by_id", classmethod(fake_get_user_by_id))
    monkeypatch.setattr(BingoBoards, "get_board_by_userid", classmethod(fake_get_board_by_userid))
    monkeypatch.setattr(
        BingoBoards,
        "get_user_selected_words",
        classmethod(fake_get_user_selected_words),
    )
    monkeypatch.setattr(
        BingoBoards,
        "update_board_by_userid",
        classmethod(fake_update_board_by_userid),
    )
    monkeypatch.setattr(
        BingoBoards,
        "update_bingo_count",
        classmethod(fake_update_bingo_count),
    )
    monkeypatch.setattr(BingoInteraction, "create", classmethod(fake_create))

    session = AsyncMock()
    service = CreateBingoInteraction(session)

    response = await service.execute('["AI"]', 1, 2)

    assert response.ok is True
    assert response.updated_words == ["AI"]
    assert response.bingo_count == 1
    assert response.send_user_name == "user-1"
    assert response.receive_user_name == "user-2"
    assert board.user_interaction_count == 1


@pytest.mark.asyncio
async def test_get_user_all_interactions_includes_user_names_and_cursor(monkeypatch):
    captured: dict[str, int | None] = {}
    interaction = SimpleNamespace(
        interaction_id=11,
        word_id_list='["AI"]',
        send_user_id=1,
        receive_user_id=2,
        created_at=datetime(2026, 3, 19, 9, 0, tzinfo=timezone.utc),
    )

    async def fake_get_user_all_interactions(
        cls,
        session,
        user_id: int,
        after_interaction_id: int | None = None,
    ):
        captured["user_id"] = user_id
        captured["after_interaction_id"] = after_interaction_id
        return [interaction]

    monkeypatch.setattr(
        BingoInteraction,
        "get_user_all_interactions",
        classmethod(fake_get_user_all_interactions),
    )

    session = AsyncMock()
    session.execute.return_value = FakeExecuteResult(
        [
            SimpleNamespace(user_id=1, user_name="보내는 사람"),
            SimpleNamespace(user_id=2, user_name="받는 사람"),
        ]
    )

    service = GetUserAllInteractions(session)

    response = await service.execute(user_id=2, after_interaction_id=10)

    assert captured == {
        "user_id": 2,
        "after_interaction_id": 10,
    }
    assert response.ok is True
    assert len(response.interactions) == 1
    assert response.interactions[0].send_user_name == "보내는 사람"
    assert response.interactions[0].receive_user_name == "받는 사람"
