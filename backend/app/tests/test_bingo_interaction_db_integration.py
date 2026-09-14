import asyncio
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import pytest
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import async_sessionmaker

from api.bingo.bingo_interaction.services import CreateBingoInteraction
from models.admin import Admin, AdminRole
from models.bingo import BingoBoards, BingoInteraction
from models.event import Event
from models.event_attendee import EventAttendee
from models.user import BingoUser


pytestmark = pytest.mark.db_integration


def _board_data(*, ai_status: int = 0, selected_ai: int = 0) -> dict:
    return {
        "0": {"value": "AI", "status": ai_status, "selected": selected_ai},
        "1": {"value": "ML", "status": 0, "selected": 0},
        "2": {"value": "Design", "status": 0, "selected": 0},
        "3": {"value": "Infra", "status": 0, "selected": 0},
    }


async def _seed_exchange_event(session):
    now = datetime.now(ZoneInfo("Asia/Seoul"))
    admin = await Admin.create(
        session,
        email="test-admin@example.com",
        password="password",
        name="테스트 관리자",
        role=AdminRole.ADMIN,
    )
    event = await Event.create(
        session,
        name="Issue 81 Regression",
        slug="issue-81-regression",
        location="테스트 장소",
        event_team="QA",
        start_time=now - timedelta(hours=1),
        end_time=now + timedelta(hours=1),
        admin_id=admin.id,
        admin_email=admin.email,
        bingo_size=2,
        success_condition=1,
        keywords=["AI", "ML", "Design", "Infra"],
    )
    sender = await BingoUser.create(
        session,
        user_name="보내는 사람",
        password="password",
        user_email="sender@example.com",
    )
    receiver = await BingoUser.create(
        session,
        user_name="받는 사람",
        password="password",
        user_email="receiver@example.com",
    )
    await EventAttendee.create(session, event.id, sender.user_id, selected_keywords=["AI"])
    await EventAttendee.create(session, event.id, receiver.user_id)

    return event, sender, receiver


@pytest.mark.anyio
async def test_exchange_persists_history_and_matching_board_update(integration_db_session):
    event, sender, receiver = await _seed_exchange_event(integration_db_session)
    await BingoBoards.create(
        integration_db_session,
        sender.user_id,
        event.id,
        _board_data(ai_status=1, selected_ai=1),
        display_name="보내는 사람",
    )
    await BingoBoards.create(
        integration_db_session,
        receiver.user_id,
        event.id,
        _board_data(),
        display_name="받는 사람",
    )

    response = await CreateBingoInteraction(integration_db_session).execute(
        '["AI"]',
        sender.user_id,
        receiver.user_id,
        event_slug=event.slug,
    )
    await integration_db_session.commit()

    receiver_board = await BingoBoards.get_board(integration_db_session, receiver.user_id, event.id)
    history = (
        await integration_db_session.execute(
            select(BingoInteraction).where(
                BingoInteraction.send_user_id == sender.user_id,
                BingoInteraction.receive_user_id == receiver.user_id,
                BingoInteraction.event_id == event.id,
            )
        )
    ).scalar_one()

    assert response.ok is True
    assert response.updated_words == ["AI"]
    assert history.word_id_list == '["AI"]'
    assert receiver_board.board_data["0"]["status"] == 1
    assert receiver_board.board_data["0"]["interaction_id"] == sender.user_id
    assert receiver_board.user_interaction_count == 1


@pytest.mark.anyio
@pytest.mark.parametrize("same_sender", [False, True])
async def test_concurrent_exchanges_preserve_both_keywords_and_counts(integration_db_session, same_sender):
    event, sender, receiver = await _seed_exchange_event(integration_db_session)
    second_sender = await BingoUser.create(
        integration_db_session, user_name="두 번째", password="password", user_email="second@example.test"
    )
    second_board = _board_data()
    second_board["1"].update(status=1, selected=1)
    for user, board in ((sender, _board_data(ai_status=1, selected_ai=1)),
                        (second_sender, second_board), (receiver, _board_data())):
        await BingoBoards.create(integration_db_session, user.user_id, event.id, board)
    await integration_db_session.commit()
    factory = async_sessionmaker(integration_db_session.bind, expire_on_commit=False)

    # Hold the receiver so both transactions reach the competing read/write.
    # Without a locking read they both derive their update from the old JSON.
    async with factory() as holder, factory() as first, factory() as second:
        await holder.execute(select(BingoBoards).where(
            BingoBoards.user_id == receiver.user_id, BingoBoards.event_id == event.id
        ).with_for_update())
        pids = [await connection.scalar(text("SELECT pg_backend_pid()")) for connection in (first, second)]

        async def exchange(session, sender_id, words):
            response = await CreateBingoInteraction(session).execute(words, sender_id, receiver.user_id, event.slug)
            await session.commit()
            return response

        tasks = [asyncio.create_task(exchange(first, sender.user_id, '["AI"]')),
                 asyncio.create_task(exchange(
                     second, sender.user_id if same_sender else second_sender.user_id,
                     '["AI"]' if same_sender else '["ML"]',
                 ))]
        try:
            for _ in range(500):
                waiting = await integration_db_session.scalar(text("""
                    SELECT count(*) FROM pg_stat_activity
                    WHERE pid IN (:first_pid, :second_pid) AND wait_event_type='Lock'
                """), {"first_pid": pids[0], "second_pid": pids[1]})
                # End the observer transaction so pg_stat_activity is not cached.
                await integration_db_session.commit()
                if waiting == 2:
                    break
                await asyncio.sleep(.01)
            assert waiting == 2, "Both exchange transactions must contend for the same receiver"
        finally:
            await holder.rollback()
            responses = await asyncio.gather(*tasks)
        assert sum(response.ok for response in responses) == (1 if same_sender else 2)

    async with factory() as session:
        board = await BingoBoards.get_board(session, receiver.user_id, event.id)
        assert board.board_data["0"]["status"] == 1
        assert board.board_data["1"]["status"] == (0 if same_sender else 1)
        assert board.user_interaction_count == (1 if same_sender else 2)
        history = await BingoInteraction.get_user_all_interactions(session, receiver.user_id, event_id=event.id)
        assert len(history) == (1 if same_sender else 2)


@pytest.mark.anyio
async def test_exchange_keeps_history_when_no_receiver_cell_changes(integration_db_session):
    event, sender, receiver = await _seed_exchange_event(integration_db_session)
    await BingoBoards.create(
        integration_db_session,
        sender.user_id,
        event.id,
        _board_data(ai_status=1, selected_ai=1),
        display_name="보내는 사람",
    )
    await BingoBoards.create(
        integration_db_session,
        receiver.user_id,
        event.id,
        _board_data(ai_status=1),
        display_name="받는 사람",
    )

    response = await CreateBingoInteraction(integration_db_session).execute(
        '["AI"]',
        sender.user_id,
        receiver.user_id,
        event_slug=event.slug,
    )
    await integration_db_session.commit()

    receiver_board = await BingoBoards.get_board(integration_db_session, receiver.user_id, event.id)
    histories = (
        await integration_db_session.execute(
            select(BingoInteraction).where(
                BingoInteraction.send_user_id == sender.user_id,
                BingoInteraction.receive_user_id == receiver.user_id,
                BingoInteraction.event_id == event.id,
            )
        )
    ).scalars().all()

    assert response.ok is True
    assert response.updated_words == []
    assert len(histories) == 1
    assert receiver_board.board_data["0"]["status"] == 1
    assert "interaction_id" not in receiver_board.board_data["0"]
    assert receiver_board.user_interaction_count == 1

    repeated = await CreateBingoInteraction(integration_db_session).execute(
        '["AI"]', sender.user_id, receiver.user_id, event_slug=event.slug,
    )
    assert repeated.ok is False
    assert "이미 동일한 참가자" in repeated.message
