"""사건 반응 창 · 선반영 삼분위 — 사전등록 event-window@2 실행(FC-REQ-028 FR-8 · F017 v4 순서 3b).

등록 → 국내(시황 · 공시 제목 + DART) · 코인 뉴스 → forecast.event_window · event_window_stat · 리포트.
매일(daily.sh, news_reaction 뒤).
"""

from __future__ import annotations

import hashlib
import json
import tomllib
from datetime import UTC, date, datetime, timedelta
from pathlib import Path

from salt_forecast.domain.calendar import report_day
from salt_forecast.domain.news_kind import from_prereg
from salt_forecast.jobs._common import base_parser, logger, parse_as_of, run_job, stage_logger
from salt_forecast.jobs.rule_ic import REPORTS, ROOT, _git_sha  # pyright: ignore[reportPrivateUsage]
from salt_forecast.scoring.event_window import MarketRun, render_report, run_market
from salt_forecast.store.db import engine
from salt_forecast.store.event_window import load_dart_titles, save_run
from salt_forecast.store.news_reaction import load_crypto_titles, load_kr_titles
from salt_forecast.store.prices import load_ohlcv_series, load_ohlcv_window
from salt_forecast.store.rule_ic import Registration, register

JOB = "event_window"
DEFAULT_PREREG = ROOT / "preregistration" / "2026-11-16-event-window-2.toml"
DICT_PREREG = (
    ROOT / "preregistration" / "2026-11-12-news-reaction-2.toml"
)  # 사전은 news-reaction@2 그대로(사전등록 [sources] dict)
MINUTE_DAYS = 400  # +30분 칸 — 5분봉 이력(국내 400일 보관 · 코인 2024-11 ~) 중 사건이 있을 법한 범위


def main(argv: list[str] | None = None) -> int:
    p = base_parser("사건 반응 창 · 선반영 삼분위(사전등록 event-window@2 실행)")
    p.add_argument("--prereg", default=str(DEFAULT_PREREG), help="사전등록 TOML")
    p.add_argument("--market", choices=("kr", "crypto", "all"), default="all")
    p.add_argument("--no-report", action="store_true", help="리포트 파일을 쓰지 않는다")
    args = p.parse_args(argv)
    log = logger(JOB)
    stage = stage_logger(log, JOB)

    def body() -> int:
        eng = engine()
        as_of = parse_as_of(args.as_of)
        raw = Path(args.prereg).read_bytes()
        spec = tomllib.loads(raw.decode())
        key = str(spec["key"])
        registered = spec["registered"]
        if not isinstance(registered, date):
            raise ValueError("registered 는 날짜")
        d = from_prereg(tomllib.loads(DICT_PREREG.read_text(encoding="utf-8")))
        sha = _git_sha()
        if not args.dry_run:
            stored = json.loads(json.dumps(spec, default=str))
            reg_at = datetime(registered.year, registered.month, registered.day, tzinfo=UTC)
            new = register(eng, Registration(key, reg_at, sha, hashlib.sha256(raw).hexdigest(), stored))
            log.info("사전등록", extra={"fields": {"job": JOB, "key": key, "new": new}})

        lo = as_of - timedelta(days=MINUTE_DAYS)
        runs: list[MarketRun] = []
        if args.market in ("kr", "all"):
            titles = load_kr_titles(eng, as_of=as_of) + load_dart_titles(eng, as_of=as_of)
            bars = load_ohlcv_series(eng, "kis", "1d")
            runs.append(run_market("kr", titles, bars, load_ohlcv_window(eng, "kis", "5m", lo, as_of), d, as_of))
            stage("kr")
        if args.market in ("crypto", "all"):
            bars = load_ohlcv_series(eng, "upbit", "1d")
            minutes = load_ohlcv_window(eng, "upbit", "5m", lo, as_of)
            runs.append(run_market("crypto", load_crypto_titles(eng, as_of=as_of), bars, minutes, d, as_of))
            stage("crypto")

        rows = 0
        now = datetime.now(UTC)
        for run in runs:
            ok = sum(1 for s in run.stats if s.status == "ok")
            fields = {"job": JOB, "market": run.market, "events": run.events, "stats": len(run.stats), "ok": ok}
            log.info("시장", extra={"fields": fields})
            if args.dry_run:
                rows += len(run.rows) + len(run.stats)
            else:
                rows += save_run(eng, key, run.market, as_of, now, run.rows, run.stats)
        if not args.no_report and runs:
            path = REPORTS / f"event-window-{key.replace('@', '-')}-{report_day(as_of)}.md"
            path.write_text(render_report(key, sha, as_of, runs), encoding="utf-8")
            log.info("리포트", extra={"fields": {"job": JOB, "path": str(path)}})
        return rows

    return run_job(JOB, args, body)


if __name__ == "__main__":
    raise SystemExit(main())
