"""작업 공통 — 인자 · 락 · 기록 · 로깅만(architecture.md §3). 로직은 없다."""

from __future__ import annotations

import argparse
import json
import logging
import resource
import signal
import sys
import time
from collections.abc import Callable
from datetime import UTC, datetime
from typing import Any

from salt_forecast.store.db import engine
from salt_forecast.store.runs import advisory_lock, close_interrupted, finish_run, start_run


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {"level": record.levelname, "msg": record.getMessage()}
        extra = getattr(record, "fields", None)
        if isinstance(extra, dict):
            payload.update(extra)  # pyright: ignore[reportUnknownArgumentType]
        return json.dumps(payload, ensure_ascii=False, default=str)


def logger(name: str) -> logging.Logger:
    log = logging.getLogger(name)
    if not log.handlers:
        h = logging.StreamHandler(sys.stderr)
        h.setFormatter(JsonFormatter())
        log.addHandler(h)
        log.setLevel(logging.INFO)
    return log


def parse_as_of(value: str | None) -> datetime:
    if value is None:
        return datetime.now(UTC)
    d = datetime.fromisoformat(value)
    return d if d.tzinfo else d.replace(tzinfo=UTC)


def base_parser(description: str) -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description=description)
    p.add_argument("--as-of", default=None, help="ISO 시각(UTC). 기본 지금")
    p.add_argument("--symbols", default=None, help="쉼표 구분. 기본 대상 전체")
    p.add_argument("--dry-run", action="store_true", help="DB 에 쓰지 않는다")
    return p


class JobTimeoutError(TimeoutError):
    """작업이 시간 상한을 넘었다 — `job_run` 에 실패로 남기고 끝낸다."""


def _on_alarm(_signum: int, _frame: object) -> None:
    raise JobTimeoutError("작업 시간 상한을 넘었다")


def run_job(name: str, args: argparse.Namespace, body: Callable[[], int], *, max_seconds: int | None = None) -> int:
    """body 는 쓴 행 수를 돌려준다. 락이 잡혀 있으면 0 으로 끝낸다.

    `max_seconds` — 넘으면 `JobTimeoutError` 로 끊는다(실패로 기록, 락은 연결과 함께 풀린다).
    외부 호출이 응답 없이 매달리면 작업이 끝나지 않고 다음 회차 · 일일 순서를 통째로 막는다
    (2026-11-10 뉴스 작업 8시간 · CPU 0%)
    """
    log = logger(name)
    if max_seconds is not None:
        signal.signal(signal.SIGALRM, _on_alarm)
        signal.alarm(max_seconds)
    eng = engine()
    with advisory_lock(eng, name) as got:
        if not got:
            log.info("이미 실행 중 — 건너뜀", extra={"fields": {"job": name}})
            return 0
        if not args.dry_run:
            close_interrupted(eng, name)
        rid = None if args.dry_run else start_run(eng, name, {k: v for k, v in vars(args).items()})
        t0 = time.perf_counter()
        try:
            rows = body()
        except Exception as e:
            if rid is not None:
                finish_run(eng, rid, ok=False, error=f"{type(e).__name__}: {str(e)[:300]}")
            raise
        finally:
            if max_seconds is not None:
                signal.alarm(0)
        ms = int((time.perf_counter() - t0) * 1000)
        if rid is not None:
            finish_run(eng, rid, ok=True, rows=rows)
        log.info("완료", extra={"fields": {"job": name, "rows": rows, "duration_ms": ms, "dry_run": args.dry_run}})
        return 0


def symbols_arg(value: str | None) -> list[str] | None:
    return [s.strip() for s in value.split(",") if s.strip()] if value else None


def progress_logger(log: logging.Logger, job: str, every: int = 10) -> Callable[[int, int], None]:
    """재학습 진행 — 경과 시간과 남은 시간 추정을 찍는다."""
    start = [time.perf_counter()]

    def report(done: int, total: int) -> None:
        if done == 1:
            start[0] = time.perf_counter()  # 모델마다 새로 잰다 — 도전자가 여럿이면 앞 모델 시간이 섞였다
        if done % every and done != total:
            return
        sec = time.perf_counter() - start[0]
        eta = sec / done * (total - done) if done else 0.0
        log.info(
            "학습 진행",
            extra={"fields": {"job": job, "done": done, "total": total, "elapsed_s": round(sec), "eta_s": round(eta)}},
        )

    return report


def stage_logger(log: logging.Logger, job: str) -> Callable[[str], None]:
    """단계 진행 — 시작부터 경과 · 최고 RSS 를 찍는다(performance.md §5). 긴 작업이 어디서 멈췄는지 보려고."""
    start = time.perf_counter()

    def report(name: str) -> None:
        # macOS 는 바이트, Linux 는 KB
        rss = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
        mb = rss / 2**20 if sys.platform == "darwin" else rss / 2**10
        log.info(
            "단계",
            extra={
                "fields": {
                    "job": job,
                    "stage": name,
                    "elapsed_s": round(time.perf_counter() - start, 1),
                    "max_rss_mb": round(mb),
                }
            },
        )

    return report
