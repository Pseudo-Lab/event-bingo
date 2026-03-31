"""
Task 4 — 이벤트 입장/퇴장 API 테스트

DB 없이 로직/구조 단위 테스트.
"""

import inspect
import random

import pytest

from api.play.routes import _build_board, play_router
from api.play.schema import JoinEventResponse


# ---------------------------------------------------------------------------
# 1. _build_board 함수 로직 테스트
# ---------------------------------------------------------------------------

class TestBuildBoard:
    def test_exact_25_keywords_returns_25_cells(self):
        """키워드 25개, board_size=5 → 딕셔너리 25개 반환"""
        keywords = [f"keyword_{i}" for i in range(25)]
        board = _build_board(keywords, board_size=5)
        assert len(board) == 25

    def test_cell_structure(self):
        """각 셀의 구조: {'value': str, 'status': 0, 'selected': 0}"""
        keywords = [f"kw_{i}" for i in range(25)]
        board = _build_board(keywords, board_size=5)
        for key, cell in board.items():
            assert "value" in cell
            assert "status" in cell
            assert "selected" in cell
            assert isinstance(cell["value"], str)
            assert cell["status"] == 0
            assert cell["selected"] == 0

    def test_keys_are_string_indices(self):
        """dict 키는 문자열 인덱스 '0'~'24'"""
        keywords = [f"kw_{i}" for i in range(25)]
        board = _build_board(keywords, board_size=5)
        expected_keys = {str(i) for i in range(25)}
        assert set(board.keys()) == expected_keys

    def test_fewer_keywords_padded_with_empty_string(self):
        """키워드가 셀보다 적을 때 빈 문자열('')로 채워짐"""
        keywords = ["a", "b", "c"]  # 3개, 5x5=25 셀 필요
        board = _build_board(keywords, board_size=5)
        assert len(board) == 25
        values = [cell["value"] for cell in board.values()]
        empty_count = values.count("")
        assert empty_count == 25 - 3

    def test_more_keywords_than_cells_truncated(self):
        """키워드가 셀보다 많을 때 cell_count 개수로 잘림 (random.sample)"""
        keywords = [f"kw_{i}" for i in range(50)]  # 50개, 4x4=16 셀
        board = _build_board(keywords, board_size=4)
        assert len(board) == 16
        # 모든 값은 원래 키워드 중 하나이고 빈 문자열 없음
        values = [cell["value"] for cell in board.values()]
        assert "" not in values
        assert all(v in keywords for v in values)

    def test_board_size_3x3(self):
        """board_size=3이면 9개 셀 반환"""
        keywords = [f"kw_{i}" for i in range(9)]
        board = _build_board(keywords, board_size=3)
        assert len(board) == 9

    def test_all_keywords_present_when_exact_match(self):
        """키워드 수 == 셀 수일 때 모든 키워드가 보드에 포함"""
        keywords = [f"kw_{i}" for i in range(9)]
        board = _build_board(keywords, board_size=3)
        values = {cell["value"] for cell in board.values()}
        assert values == set(keywords)

    def test_board_structure_is_shuffled(self):
        """여러 번 실행 시 키워드 순서가 달라질 수 있음 (구조 확인)"""
        keywords = [str(i) for i in range(25)]
        # 구조 확인: 셔플된 결과도 키워드 집합이 동일해야 함
        board = _build_board(keywords, board_size=5)
        values = {cell["value"] for cell in board.values()}
        assert values == set(keywords)

    def test_empty_keywords_all_empty_cells(self):
        """키워드가 없으면 모든 셀이 빈 문자열"""
        board = _build_board([], board_size=3)
        assert len(board) == 9
        for cell in board.values():
            assert cell["value"] == ""


# ---------------------------------------------------------------------------
# 2. play_router 경로 존재 확인
# ---------------------------------------------------------------------------

class TestPlayRouterPaths:
    def _get_paths(self):
        return {route.path for route in play_router.routes}

    def test_join_endpoint_exists(self):
        """POST /play/events/{event_slug}/join 경로 존재

        play_router에 prefix="/play"가 설정되어 있으므로
        router.routes에는 전체 경로 '/play/events/{event_slug}/join'으로 저장된다.
        """
        paths = self._get_paths()
        assert "/play/events/{event_slug}/join" in paths

    def test_leave_endpoint_not_exists(self):
        """퇴장 엔드포인트는 존재하지 않음"""
        paths = self._get_paths()
        assert "/play/events/{event_slug}/leave" not in paths

    def test_join_method_is_post(self):
        """join 엔드포인트 HTTP 메서드가 POST"""
        for route in play_router.routes:
            if route.path == "/play/events/{event_slug}/join":
                assert "POST" in route.methods
                break
        else:
            pytest.fail("join 라우트를 찾을 수 없습니다.")


# ---------------------------------------------------------------------------
# 3. play_router가 api_router에 등록됐는지 확인
# ---------------------------------------------------------------------------

class TestPlayRouterRegistration:
    def test_play_router_in_routers_list(self):
        """api/__init__.py의 routers 리스트에 play_router 포함"""
        from api import routers
        from api.play.routes import play_router as _play_router

        assert _play_router in routers

    def test_play_router_included_in_api_router(self):
        """api_router에 play_router가 include 됐는지 확인"""
        from api import api_router

        included_prefixes = [
            route.path for route in api_router.routes
        ]
        # play_router prefix "/play"가 api_router 하위에 존재해야 함
        play_paths = [p for p in included_prefixes if "/play/" in p]
        assert len(play_paths) > 0, "api_router에 play 관련 경로가 없습니다."


# ---------------------------------------------------------------------------
# 4. JoinEventResponse 스키마 필드 확인
# ---------------------------------------------------------------------------

class TestJoinEventResponseSchema:
    def test_required_fields_exist(self):
        """attendee_id, event_id, user_id 필수 필드"""
        fields = JoinEventResponse.model_fields
        assert "attendee_id" in fields
        assert "event_id" in fields
        assert "user_id" in fields

    def test_optional_fields_exist(self):
        """room_id, team_id Optional 필드"""
        fields = JoinEventResponse.model_fields
        assert "room_id" in fields
        assert "team_id" in fields

    def test_room_id_is_optional(self):
        """room_id는 None 허용"""
        fields = JoinEventResponse.model_fields
        room_id_field = fields["room_id"]
        # Pydantic v2에서 is_required()가 False이면 Optional
        assert not room_id_field.is_required()

    def test_team_id_is_optional(self):
        """team_id는 None 허용"""
        fields = JoinEventResponse.model_fields
        team_id_field = fields["team_id"]
        assert not team_id_field.is_required()

    def test_attendee_id_is_required(self):
        """attendee_id는 필수"""
        fields = JoinEventResponse.model_fields
        assert fields["attendee_id"].is_required()

    def test_event_id_is_required(self):
        """event_id는 필수"""
        fields = JoinEventResponse.model_fields
        assert fields["event_id"].is_required()

    def test_user_id_is_required(self):
        """user_id는 필수"""
        fields = JoinEventResponse.model_fields
        assert fields["user_id"].is_required()

    def test_board_field_exists(self):
        """board 필드 존재 (빙고판 데이터)"""
        fields = JoinEventResponse.model_fields
        assert "board" in fields

    def test_inherits_base_schema_fields(self):
        """BaseSchema 상속 → ok, message 필드 존재"""
        fields = JoinEventResponse.model_fields
        assert "ok" in fields
        assert "message" in fields

    def test_instantiation_with_minimal_data(self):
        """필수 필드만으로 인스턴스 생성 가능"""
        resp = JoinEventResponse(
            ok=True,
            message="입장 완료",
            attendee_id=1,
            event_id=10,
            user_id=100,
            board={"0": {"value": "test", "status": 0, "selected": 0}},
        )
        assert resp.attendee_id == 1
        assert resp.event_id == 10
        assert resp.user_id == 100
        assert resp.room_id is None
        assert resp.team_id is None

    def test_instantiation_with_optional_fields(self):
        """room_id, team_id 포함 인스턴스 생성"""
        resp = JoinEventResponse(
            ok=True,
            message="입장 완료",
            attendee_id=2,
            event_id=20,
            user_id=200,
            room_id=5,
            team_id=3,
            board={"0": {"value": "hi", "status": 0, "selected": 0}},
        )
        assert resp.room_id == 5
        assert resp.team_id == 3


# ---------------------------------------------------------------------------
# 5. _assign_room_and_team 함수 존재 확인
# ---------------------------------------------------------------------------

class TestAssignRoomAndTeamExists:
    def test_function_is_importable(self):
        """_assign_room_and_team이 import 가능한 함수로 존재"""
        from api.play.routes import _assign_room_and_team
        assert callable(_assign_room_and_team)

    def test_function_is_coroutine(self):
        """_assign_room_and_team은 async 함수(코루틴 함수)"""
        from api.play.routes import _assign_room_and_team
        assert inspect.iscoroutinefunction(_assign_room_and_team)

    def test_function_signature(self):
        """_assign_room_and_team(session, event) 시그니처 확인"""
        from api.play.routes import _assign_room_and_team
        sig = inspect.signature(_assign_room_and_team)
        params = list(sig.parameters.keys())
        assert "session" in params
        assert "event" in params
