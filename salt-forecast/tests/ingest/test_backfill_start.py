"""빈 곳 메우기 시작점 — 다 찬 종목엔 요청을 보내지 않는다(ops/backfill.sh 가 매시 부른다)."""

from datetime import UTC, datetime, timedelta

from salt_forecast.jobs.ingest_prices import backfill_start

SINCE = datetime(2024, 11, 1, tzinfo=UTC)


def at(y: int, m: int, d: int, h: int = 0) -> datetime:
    return datetime(y, m, d, h, tzinfo=UTC)


def test_boundary_table() -> None:
    cases = [
        # (상장 = 일봉 첫 봉, 이미 있는 가장 이른 5분봉) → 시작(= earliest 면 구간이 비어 요청 0)
        (at(2017, 9, 25), at(2024, 11, 1), at(2024, 11, 1)),  # since 까지 다 참
        (at(2017, 9, 25), at(2024, 11, 1, 23), at(2024, 11, 1, 23)),  # 하루 여유 안 — 다 찬 것으로
        (at(2017, 9, 25), at(2024, 11, 2, 1), SINCE),  # 하루 넘게 비었다 — 이어 받는다
        (at(2017, 9, 25), at(2026, 10, 17), SINCE),  # 최근 한 달만 있다(세션과 함께 죽은 백필)
        (at(2026, 3, 1), at(2026, 3, 1, 6), at(2026, 3, 1, 6)),  # since 뒤 상장 · 상장 첫날부터 참
        (at(2026, 3, 1), at(2026, 10, 17), at(2026, 3, 1)),  # since 뒤 상장 · 상장일부터 이어 받는다
        (None, at(2026, 10, 17), SINCE),  # 일봉이 없으면 since 부터
    ]
    for listed, earliest, want in cases:
        assert backfill_start(SINCE, listed, earliest) == want, (listed, earliest)


def test_no_rows_yet_fetches_everything() -> None:
    now = at(2026, 11, 16, 6)
    assert backfill_start(SINCE, at(2017, 9, 25), now) == SINCE
    assert backfill_start(SINCE, at(2017, 9, 25), now) < now - timedelta(days=700)
