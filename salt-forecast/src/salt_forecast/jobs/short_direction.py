"""단타 방향 확률 — 사전등록 short-direction@2 실행(FC-REQ-028 FR-1 · FR-4 · F017 v2 단계 5).

- `test`(매일): 등록 → 전 이력 walk-forward 시험(코인 1h · 4h · 1d
  · 국내 1d) → 라이브 소등 → forecast.short_horizon_test · 리포트.
- `live`(매시 :03
  — 1시간봉 증분 뒤): 만료 예측 채점 → 통과한 칸만 마지막 격자 행 예측 → forecast.short_horizon_prediction.
  통과한 칸이 없으면 채점만 하고 끝난다(확률을 만들지 않는다 — 불변식 1).
"""

from __future__ import annotations

import hashlib
import json
import tomllib
from datetime import UTC, date, datetime, timedelta
from pathlib import Path

import numpy as np

from salt_forecast.domain.series import DAY
from salt_forecast.domain.short_direction import (
    CRYPTO_SPECS,
    HOUR,
    KEY,
    KR_SPEC,
    Fit,
    live_ready,
    live_track,
    live_underperforms,
)
from salt_forecast.jobs._common import base_parser, logger, parse_as_of, run_job, stage_logger
from salt_forecast.jobs.rule_ic import REPORTS, ROOT, _git_sha  # pyright: ignore[reportPrivateUsage]
from salt_forecast.scoring.short_direction import (
    KR_LIVE_SESSIONS,
    LIVE_HOURS,
    crypto_panel,
    kr_panel,
    live_predictions,
    render_report,
    run_test,
)
from salt_forecast.store.db import engine
from salt_forecast.store.kr_stock import krx_closed_dates
from salt_forecast.store.predictions import register_model
from salt_forecast.store.prices import load_ohlcv_series
from salt_forecast.store.rule_ic import Registration, register
from salt_forecast.store.short_direction import (
    CellTestRow,
    PredictionRow,
    live_outcomes,
    passed_cells,
    save_predictions,
    save_test,
    score_due,
)

JOB = "short_direction"
DEFAULT_PREREG = ROOT / "preregistration" / "2026-11-11-short-direction-2.toml"
HOURS = {"1h": 1, "4h": 4, "1d": 24}


def model_version(sha: str) -> str:
    return f"{KEY}+{sha}"


def next_kr_close(as_of: datetime, closed: set[date]) -> datetime:
    """기준 거래일 16:00 KST 다음 거래일 16:00 KST — 주말 · 휴장 공시 표를 건너뛴다."""
    kst = as_of + timedelta(hours=9)
    d = kst.date() + timedelta(days=1)
    while d.weekday() >= 5 or d in closed:
        d += timedelta(days=1)
    return datetime(d.year, d.month, d.day, 7, tzinfo=UTC)


def _register(eng: object, path: Path, sha: str) -> None:
    raw = path.read_bytes()
    spec = tomllib.loads(raw.decode())
    if spec["key"] != KEY:
        raise ValueError(f"사전등록 키가 코드와 다르다: {spec['key']} != {KEY}")
    reg = spec["registered"]
    reg_at = datetime(reg.year, reg.month, reg.day, tzinfo=UTC)
    stored = json.loads(json.dumps(spec, default=str))
    register(eng, Registration(KEY, reg_at, sha, hashlib.sha256(raw).hexdigest(), stored))  # pyright: ignore[reportArgumentType]


def main(argv: list[str] | None = None) -> int:
    p = base_parser("단타 방향 확률(사전등록 short-direction@2 실행)")
    p.add_argument("command", choices=("test", "live"))
    p.add_argument("--prereg", default=str(DEFAULT_PREREG), help="사전등록 TOML")
    p.add_argument("--market", choices=("crypto", "kr", "all"), default="all")
    p.add_argument("--no-report", action="store_true", help="리포트 파일을 쓰지 않는다")
    args = p.parse_args(argv)
    log = logger(JOB)
    stage = stage_logger(log, JOB)

    def test() -> int:
        eng = engine()
        as_of = parse_as_of(args.as_of)
        sha = _git_sha()
        mv = model_version(sha)
        if not args.dry_run:
            _register(eng, Path(args.prereg), sha)
            register_model(eng, mv, "short_direction", {"prereg": KEY, "features": 7, "l2": 1.0})
        crypto = load_ohlcv_series(eng, "upbit", "1h") if args.market in ("crypto", "all") else None
        kr = load_ohlcv_series(eng, "kis", "1d") if args.market in ("kr", "all") else None
        stage("load")
        run = run_test(crypto, kr, as_of)
        stage("test")
        rows: list[CellTestRow] = []
        for c in run.cells:
            r = c.result
            syms = run.symbols.get(r.market, ())
            misses = [
                {"asOf": datetime.fromtimestamp(w, tz=UTC).isoformat(), "symbol": syms[s], "pUp": pu, "realized": rr}
                for w, s, pu, rr in r.misses
            ]
            origin, calls, hits, ups = "backtest", r.confident, r.confident_hits, r.always_up_hits
            ready = False
            if r.status == "pass":
                # 라이브 = 이 키 등록 뒤 낸 예측 전부(커밋 해시가 바뀌어도 같은 프로토콜 — 표본을 0 으로 돌리지 않는다)
                live = live_outcomes(eng, r.market, r.horizon, KEY)
                if live:
                    spec = CRYPTO_SPECS[r.horizon] if r.market == "crypto" else KR_SPEC
                    pp = np.array([x.p_up for x in live])
                    rr = np.array([x.realized for x in live])
                    days = np.array([int(x.as_of.timestamp()) // DAY for x in live], dtype=np.int64)
                    up = (rr > 0).astype(np.float64)
                    if live_underperforms(pp, up, days, spec.boot_block):
                        r.status, r.reason = "fail", "live_underperforms"
                    ready = r.status == "pass" and live_ready(pp, up, days, spec.boot_block)
                    track = live_track(pp, rr)
                    if track is not None:  # 라이브가 300 을 넘으면 화면 성적은 라이브만(과거 검산과 합치지 않는다)
                        origin, calls, hits, ups = "live", track.calls, track.hits, track.always_up
                        misses = [
                            {"asOf": live[i].as_of.isoformat(), "symbol": live[i].symbol, "pUp": live[i].p_up,
                             "realized": live[i].realized}
                            for i in track.misses
                        ]  # fmt: skip
            rows.append(
                CellTestRow(
                    r.market, r.horizon, r.status, r.reason, r.window, r.rows, r.bss, r.bss_lo, r.bss_hi,
                    None if r.status == "not_tested" else r.bss_p_holm, r.bss_persistence, r.ece, origin, calls,
                    hits, ups, r.hit_diff_lo, r.hit_diff_hi, r.net_mean, r.placebo_lo, r.placebo_hi,
                    [[n, pm, ym] for n, pm, ym in r.reliability], misses,
                    {k: list(v) for k, v in r.z_quantiles.items()}, None if c.fit is None else c.fit.to_json(),
                    ready, r.bss_climatology,
                )
            )  # fmt: skip
            log.info(
                "칸",
                extra={"fields": {"job": JOB, "market": r.market, "horizon": r.horizon, "status": r.status,
                                  "reason": r.reason, "rows": r.rows, "bss": round(r.bss, 5) if r.rows else None,
                                  "ece": round(r.ece, 4) if r.rows else None, "confident": r.confident}},
            )  # fmt: skip
        written = len(rows) if args.dry_run else save_test(eng, KEY, mv, as_of, rows, datetime.now(UTC))
        if not args.no_report:
            path = REPORTS / f"short-direction-{KEY.replace('@', '-')}-{as_of.date().isoformat()}.md"
            path.write_text(render_report(KEY, sha, as_of, run), encoding="utf-8")
            log.info("리포트", extra={"fields": {"job": JOB, "path": str(path)}})
        return written

    def live() -> int:
        eng = engine()
        as_of = parse_as_of(args.as_of)
        now = datetime.now(UTC)
        scored = 0 if args.dry_run else score_due(eng, now)
        cells = [c for c in passed_cells(eng, KEY, as_of) if args.market in ("all", c.market)]
        log.info(
            "통과 칸",
            extra={"fields": {"job": JOB, "cells": [f"{c.market}:{c.horizon}" for c in cells], "scored": scored}},
        )
        if not cells:
            return scored
        preds: list[PredictionRow] = []
        closed = set(krx_closed_dates(eng)) if any(c.market == "kr" for c in cells) else set[date]()
        crypto_cp = None
        kr_cp = None
        for c in cells:
            if c.market == "crypto":
                if crypto_cp is None:
                    start = int((as_of - timedelta(hours=LIVE_HOURS)).timestamp())
                    crypto_cp = crypto_panel(load_ohlcv_series(eng, "upbit", "1h"), start, as_of)
                h = HOURS[c.horizon]
                out = live_predictions(crypto_cp, "crypto", c.horizon, h, Fit.from_json(c.live_params), c.z_quantiles)
                preds += [
                    PredictionRow(x.symbol, x.horizon, x.as_of, c.model_version, "crypto", x.p_up, x.q10, x.q50, x.q90,
                                  x.ref_price, x.invalidation, x.as_of + timedelta(seconds=h * HOUR))
                    for x in out
                ]  # fmt: skip
            else:
                if kr_cp is None:
                    start = int((as_of - timedelta(days=KR_LIVE_SESSIONS * 7 // 5 + 30)).timestamp())
                    kr_cp, _ = kr_panel(load_ohlcv_series(eng, "kis", "1d"), start, as_of)
                out = live_predictions(kr_cp, "kr", c.horizon, 1, Fit.from_json(c.live_params), c.z_quantiles)
                preds += [
                    PredictionRow(x.symbol, x.horizon, x.as_of, c.model_version, "kr", x.p_up, x.q10, x.q50, x.q90,
                                  x.ref_price, x.invalidation, next_kr_close(x.as_of, closed))
                    for x in out
                ]  # fmt: skip
        if args.dry_run:
            return scored + len(preds)
        return scored + save_predictions(eng, KEY, preds, now)

    # 작업 이름을 둘로 — 매시 게이트(`due --job short_direction_live`)와 매일 시험이 서로의 마지막 성공을 보지 않게
    return run_job(JOB if args.command == "test" else f"{JOB}_live", args, test if args.command == "test" else live)


if __name__ == "__main__":
    raise SystemExit(main())
