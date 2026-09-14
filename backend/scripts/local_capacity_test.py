"""Run real HTTP workloads against a disposable LOCAL Postgres database.

This checks backend capacity and data integrity, not Supabase Auth/Realtime.
Requires an empty database, ENV=test and TEST_DB_URL pointing to loopback.
"""

import argparse
import asyncio
from collections import defaultdict
from datetime import datetime, timedelta, timezone
import json
import math
import os
from pathlib import Path
import socket
import subprocess
import sys
import tempfile
import time

import asyncpg
import httpx
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool


def percentile(values, fraction):
    return round(sorted(values)[math.ceil(len(values) * fraction) - 1], 2) if values else None


async def main(args):
    app_dir = args.app_dir.resolve()
    sys.path.insert(0, str(app_dir))
    from core.db import assert_safe_test_database_url
    import models
    import main as application  # Register all route-owned models before creating tables.

    database_url = os.environ["TEST_DB_URL"]
    assert_safe_test_database_url(database_url)
    database_connection = await asyncpg.connect(database_url.replace("+asyncpg", ""))
    # Never reset an existing application's tables, even on a local database.
    if await database_connection.fetchval("SELECT to_regclass('public.bingo_user')"):
        await database_connection.close()
        raise RuntimeError("Use a new, empty local test database for each run.")
    engine = create_async_engine(database_url, poolclass=NullPool)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    keywords = [f"Keyword {index}" for index in range(25)]
    selected = {
        user_id: {keywords[(user_id + offset) % 25] for offset in range(3)}
        for user_id in range(1, args.users + 1)
    }
    password = "local-synthetic-password"
    password_hash = models.BingoUser.hash_password(password)
    slug = "local-capacity-test"
    try:
        async with engine.begin() as connection:
            await connection.run_sync(models.Base.metadata.create_all)
        async with session_factory() as session:
            admin = models.Admin(email="admin@example.test", password=password_hash, name="Synthetic admin")
            session.add(admin)
            await session.flush()
            now = datetime.now(timezone.utc)
            event = models.Event(
                name="Local capacity test", slug=slug, admin_id=admin.id, admin_email=admin.email,
                start_time=now - timedelta(hours=1), end_time=now + timedelta(hours=2),
                bingo_size=5, success_condition=3, keywords=keywords, restrict_before_start=False,
            )
            session.add(event)
            await session.flush()
            event_id = event.id
            for user_id in range(1, args.users + 1):
                session.add(models.BingoUser(
                    user_id=user_id, user_name=f"Participant {user_id:03d}",
                    user_email=f"participant-{user_id}@example.test", login_id=f"L{user_id:05d}",
                    password_hash=password_hash,
                ))
            await session.flush()
            for user_id in range(1, args.users + 1):
                session.add(models.EventAttendee(event_id=event_id, user_id=user_id))
                session.add(models.BingoBoards(
                    event_id=event_id, user_id=user_id, display_name=f"Participant {user_id:03d}",
                    board_data={str(index): {
                        "value": word, "status": int(word in selected[user_id]),
                        "selected": int(word in selected[user_id]),
                    } for index, word in enumerate(keywords)},
                ))
            await session.commit()
    finally:
        await engine.dispose()

    with socket.socket() as listener:
        listener.bind(("127.0.0.1", 0))
        port = listener.getsockname()[1]
    run_dir = Path(tempfile.mkdtemp(prefix="event-bingo-capacity-"))
    env = {**os.environ, "ENV": "capacity-test", "DB_URL": database_url,
           "SUPABASE_URL": "", "SUPABASE_KEY": "", "SUPABASE_JWT_SECRET": "",
           "ADMIN_JWT_SECRET": "local-test-only", "PRIVACY_REDACTION_RUN_ON_STARTUP": "false"}
    samples = defaultdict(list)
    errors = defaultdict(int)
    created = {}
    pairs = set()
    cursors = defaultdict(int)
    phase = "startup"
    peak_connections = 0
    monitoring = True
    participant_clients = []
    started = time.monotonic()
    summary = None
    log_file = (run_dir / "backend.log").open("w")
    server = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "main:app", "--app-dir", str(app_dir),
         "--host", "127.0.0.1", "--port", str(port), "--workers", str(args.workers),
         "--no-access-log"], cwd=run_dir, env=env, stdout=log_file, stderr=subprocess.STDOUT,
    )

    async def monitor():
        nonlocal peak_connections
        last_report = time.monotonic()
        while monitoring:
            count = await database_connection.fetchval("""
                SELECT count(*) FROM pg_stat_activity
                WHERE datname=current_database() AND pid<>pg_backend_pid()
                  AND backend_type='client backend'
            """)
            peak_connections = max(peak_connections, count)
            if time.monotonic() - last_report >= 30:
                print(json.dumps({"phase": phase, "elapsed_seconds": round(time.monotonic() - started),
                                  "created": len(created), "errors": dict(errors)}), flush=True)
                last_report = time.monotonic()
            await asyncio.sleep(0.1)

    monitor_task = asyncio.create_task(monitor())
    try:
        async with httpx.AsyncClient(
            base_url=f"http://127.0.0.1:{port}", timeout=15,
            limits=httpx.Limits(max_connections=args.users * 4, max_keepalive_connections=args.users * 2),
        ) as client:
            # Each virtual browser owns its HTTP pool. A single shared HTTPX pool
            # otherwise adds client-side contention between hundreds of users.
            participant_clients = [httpx.AsyncClient(
                base_url=f"http://127.0.0.1:{port}", timeout=15, verify=False,
                # Retire idle sockets before Uvicorn's default five-second close.
                limits=httpx.Limits(max_connections=6, max_keepalive_connections=6, keepalive_expiry=2),
            ) for _ in selected]
            for _ in range(120):
                if server.poll() is not None:
                    raise RuntimeError(f"Backend failed to start; inspect {run_dir / 'backend.log'}")
                try:
                    ready_workers = (run_dir / "backend.log").read_text().count("Application startup complete.")
                    if ready_workers == args.workers and (await client.get("/health")).is_success:
                        break
                except httpx.RequestError:
                    pass
                await asyncio.sleep(0.25)
            else:
                raise RuntimeError("Local backend readiness timed out")

            async def request(kind, method, path, *, participant=None, **kwargs):
                request_phase = phase
                before = time.monotonic()
                try:
                    transport = participant_clients[participant - 1] if participant else client
                    response = await transport.request(method, path, **kwargs)
                    if response.status_code >= 500:
                        errors[f"{request_phase}:http5xx"] += 1
                    payload = response.json()
                    if not response.is_success or payload.get("ok") is False:
                        errors[f"{request_phase}:{kind}"] += 1
                        errors[f"{request_phase}:status_{response.status_code}"] += 1
                    return payload
                except (httpx.RequestError, ValueError) as error:
                    errors[f"{request_phase}:{kind}"] += 1
                    errors[f"{request_phase}:{type(error).__name__}"] += 1
                    return {}
                finally:
                    samples[f"{request_phase}:{kind}"].append((time.monotonic() - before) * 1000)

            async def state(user_id):
                _, history = await asyncio.gather(
                    request("board", "GET", f"/api/bingo/boards/{user_id}", participant=user_id, params={"event_slug": slug}),
                    request("history", "GET", f"/api/bingo/interactions/{user_id}/all",
                            participant=user_id, params={"event_slug": slug, "after_interaction_id": cursors[user_id]}),
                )
                cursors[user_id] = max([cursors[user_id]] + [row["interaction_id"] for row in history.get("interactions", [])])

            async def exchange(sender, receiver):
                if (sender, receiver) in pairs:
                    return
                pairs.add((sender, receiver))
                result = await request("exchange", "POST", "/api/bingo/interactions", participant=sender, json={
                    "word_id_list": json.dumps(sorted(selected[sender])),
                    "send_user_id": sender, "receive_user_id": receiver, "event_slug": slug,
                })
                if result.get("ok") and isinstance(result.get("interaction_id"), int):
                    created[result["interaction_id"]] = (sender, receiver)
                    # Approximate the API reconciliation caused by two Realtime recipients.
                    # This is NOT a WebSocket delivery latency measurement.
                    await asyncio.gather(state(sender), state(receiver))

            phase = "login"
            async def login(user_id):
                await asyncio.sleep((user_id - 1) / args.login_rate)
                result = await request("login", "POST", "/api/auth/bingo/login", participant=user_id, json={
                    "login_id": f"L{user_id:05d}", "password": password, "event_slug": slug,
                })
                if result.get("user_id") != user_id:
                    errors["login:identity"] += 1
            await asyncio.gather(*(login(user_id) for user_id in selected))
            print(json.dumps({"phase": phase, "requests": args.users, "errors": dict(errors)}), flush=True)

            phase = "burst"
            await asyncio.gather(*(request("health", "GET", "/health", participant=user_id) for user_id in selected))
            await asyncio.gather(*(state(user_id) for user_id in selected))
            await asyncio.gather(*(exchange(user_id, user_id % args.users + 1) for user_id in selected))
            phase = "same_receiver"
            await asyncio.gather(*(exchange(user_id, 1) for user_id in range(2, min(args.users, 27))))
            print(json.dumps({"phase": phase, "created": len(created), "errors": dict(errors)}), flush=True)

            phase = "sustained"
            load_start = time.monotonic()
            deadline = load_start + args.duration
            async def participant(user_id):
                next_poll = load_start + (user_id - 1) * args.poll_interval / args.users
                next_exchange = load_start + (user_id - 1) * args.exchange_interval / args.users
                round_number = 2
                while time.monotonic() < deadline:
                    await asyncio.sleep(max(0, min(next_poll, next_exchange, deadline) - time.monotonic()))
                    if time.monotonic() >= deadline:
                        break
                    if time.monotonic() >= next_poll:
                        await state(user_id)
                        next_poll = time.monotonic() + args.poll_interval
                    if time.monotonic() >= next_exchange:
                        receiver = (user_id - 1 + round_number) % args.users + 1
                        await request("search", "GET", "/api/auth/bingo/search", participant=user_id, params={
                            "q": f"Participant {receiver:03d}", "event_slug": slug, "exclude_user_id": user_id,
                        })
                        if receiver != user_id:
                            await exchange(user_id, receiver)
                        round_number += 1
                        next_exchange = time.monotonic() + args.exchange_interval
            await asyncio.gather(*(participant(user_id) for user_id in selected))
            sustained_seconds = time.monotonic() - load_start

            phase = "verify"
            expected_received = defaultdict(list)
            expected_ids = defaultdict(set)
            for interaction_id, (sender, receiver) in created.items():
                expected_received[receiver].append(sender)
                expected_ids[sender].add(interaction_id)
                expected_ids[receiver].add(interaction_id)
            async def verify(user_id):
                board, history = await asyncio.gather(
                    request("board", "GET", f"/api/bingo/boards/{user_id}", participant=user_id, params={"event_slug": slug}),
                    request("history", "GET", f"/api/bingo/interactions/{user_id}/all", participant=user_id, params={"event_slug": slug}),
                )
                if not board.get("ok") or not history.get("ok"):
                    errors["verify:incomplete"] += 1
                    return
                actual_ids = [row["interaction_id"] for row in history.get("interactions", [])]
                if set(actual_ids) != expected_ids[user_id] or len(actual_ids) != len(set(actual_ids)):
                    errors["verify:history_mismatch"] += 1
                if board.get("user_interaction_count") != len(expected_received[user_id]):
                    errors["verify:received_count_mismatch"] += 1
                expected_words = selected[user_id].union(*(selected[sender] for sender in expected_received[user_id]))
                actual_words = {cell["value"] for cell in (board.get("board_data") or {}).values() if cell.get("status") == 1}
                if actual_words != expected_words:
                    errors["verify:board_mismatch"] += 1
            # Verification is not another burst workload: avoid conflating a
            # failed final read with a successfully read but inconsistent board.
            for start in range(1, args.users + 1, 20):
                await asyncio.gather(*(verify(user_id) for user_id in range(start, min(start + 20, args.users + 1))))
            monitoring = False
            await monitor_task
            actual_rows = await database_connection.fetchval("SELECT count(*) FROM public.bingo_interaction")
            if actual_rows != len(created):
                errors["verify:db_row_mismatch"] += 1
            sustained_samples = [sample for key, values in samples.items() if key.startswith("sustained:") for sample in values]
            summary = {
                "users": args.users, "workers": args.workers, "duration_seconds": round(sustained_seconds, 2),
                "poll_interval_seconds": args.poll_interval, "exchange_interval_per_user_seconds": args.exchange_interval,
                "login_rate_per_second": args.login_rate, "peak_database_connections": peak_connections,
                "created_interactions": len(created), "errors": dict(errors),
                "sustained_p95_ms": percentile(sustained_samples, .95),
                "requests": {key: {"count": len(values), "p50_ms": percentile(values, .5),
                                   "p95_ms": percentile(values, .95), "p99_ms": percentile(values, .99)}
                             for key, values in sorted(samples.items())},
                "websocket_delivery_tested": False, "supabase_auth_tested": False,
                "seconds_total": round(time.monotonic() - started, 2), "backend_log": str(run_dir / "backend.log"),
            }
            summary["latency_failures"] = [
                key for key, result in summary["requests"].items()
                if not key.startswith("verify:") and result["p95_ms"] > args.max_p95_ms
            ]
            summary["max_p95_ms"] = args.max_p95_ms
            summary["passed"] = not errors and bool(sustained_samples) and not summary["latency_failures"]
    finally:
        monitoring = False
        await monitor_task
        await database_connection.close()
        await asyncio.gather(*(client.aclose() for client in participant_clients))
        server.terminate()
        try:
            await asyncio.to_thread(server.wait, timeout=15)
        except subprocess.TimeoutExpired:
            server.kill()
            await asyncio.to_thread(server.wait)
        log_file.close()
    print(json.dumps(summary, indent=2), flush=True)
    if args.result:
        with args.result.open("x") as output:
            json.dump(summary, output, indent=2)
    return 0 if summary["passed"] else 1


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--app-dir", type=Path, default=Path(__file__).resolve().parents[1] / "app")
    parser.add_argument("--users", type=int, default=200)
    parser.add_argument("--workers", type=int, default=4)
    parser.add_argument("--duration", type=float, default=600)
    parser.add_argument("--poll-interval", type=float, default=11)
    parser.add_argument("--exchange-interval", type=float, default=30)
    parser.add_argument("--login-rate", type=float, default=5)
    parser.add_argument("--max-p95-ms", type=float, default=1000)
    parser.add_argument("--result", type=Path)
    args = parser.parse_args()
    if args.users < 4 or min(args.workers, args.duration, args.poll_interval, args.exchange_interval, args.login_rate, args.max_p95_ms) <= 0:
        parser.error("Require at least four users and positive duration, intervals, rate and workers")
    sys.exit(asyncio.run(main(args)))
