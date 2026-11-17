"""H1 흔들림 · 범위 — 사전등록 vol-range@3 실행(@1 + 동결 재생, FC-REQ-028 FR-9 · F017 v4 순서 4).

매일(daily.sh): 등록 → 1차 판정(자료 끝 2026-11-12) → 열린 전진 예측 채점 → 오늘 마지막 봉 예측 기록 →
놓친 봉 동결 재생 → 판정 날짜가 지났으면 그 판정(1차 통과 칸만, 그 날짜 전 기준 봉) → forecast.vol_range_test · 리포트.
"""

from __future__ import annotations

import hashlib
import json
import tomllib
from collections.abc import Callable, Mapping
from datetime import UTC, datetime, timedelta
from pathlib import Path

from sqlalchemy import Engine

from salt_forecast.domain.calendar import report_day
from salt_forecast.domain.series import OhlcvSeries
from salt_forecast.domain.vol_range import (
    HISTORY_END,
    KEY,
    LEVELS,
    REGISTERED_AT,
    ForwardResult,
    ForwardRow,
    VolPanel,
    forward_judge,
    forward_result,
    look_cutoff,
    look_due,
    prepare,
    replay_bars,
)
from salt_forecast.jobs._common import base_parser, logger, parse_as_of, run_job, stage_logger
from salt_forecast.jobs.rule_ic import REPORTS, ROOT, _git_sha  # pyright: ignore[reportPrivateUsage]
from salt_forecast.jobs.short_direction import code_changed_since
from salt_forecast.scoring.vol_range import (
    LiveCell,
    crypto_panel,
    kr_panel,
    live_cells,
    render_report,
    run_history,
    score_open,
)
from salt_forecast.store.db import engine
from salt_forecast.store.predictions import register_model
from salt_forecast.store.prices import load_ohlcv_series
from salt_forecast.store.rule_ic import Registration, register
from salt_forecast.store.vol_range import (
    PredictionRow,
    TestRow,
    load_predictions,
    model_version_at,
    previous,
    save_new_predictions,
    save_scored,
    save_test,
)

JOB = "vol_range"
DEFAULT_PREREG = ROOT / "preregistration" / "2026-11-16-vol-range-3.toml"
_KST = timedelta(hours=9)


def _register(eng: object, path: Path, sha: str) -> bool:
    raw = path.read_bytes()
    spec = tomllib.loads(raw.decode())
    if spec["key"] != KEY:
        raise ValueError(f"사전등록 키가 코드와 다르다: {spec['key']} != {KEY}")
    reg = spec["registered"]
    stored = json.loads(json.dumps(spec, default=str))
    reg_at = datetime(reg.year, reg.month, reg.day, tzinfo=UTC)
    return register(eng, Registration(KEY, reg_at, sha, hashlib.sha256(raw).hexdigest(), stored))  # pyright: ignore[reportArgumentType]


def forward_rows(
    rows: list[PredictionRow], market: str, h: int, cutoff: int | None = None, realtime_only: bool = False
) -> list[ForwardRow]:
    """판정 표본 — 등록 뒤 기준 봉 · 라벨 닫힘 · 기준 셋 다 있음 · (판정 날짜면) 그 날짜 전 기준 봉.

    @3: 제때 기록(in_time) 행 + 동결 재생 행(in_time = false — 실시간은 늘 마지막 봉만 쓰므로 늦은 행은 재생뿐).
    realtime_only 는 리포트 민감도용."""
    out: list[ForwardRow] = []
    for r in rows:
        if (r.market, r.horizon) != (market, h) or r.scored_at is None or (realtime_only and not r.in_time):
            continue
        if r.ref_at < REGISTERED_AT or r.realized_rv is None or r.realized_r is None:
            continue
        if cutoff is not None and r.ref_at.timestamp() >= cutoff:
            continue
        if r.rv_b1 is None or r.rv_b2 is None or r.rv_b3 is None or r.half80 is None or r.half95 is None:
            continue
        base = {"b1": r.rv_b1, "b2": r.rv_b2, "b3": r.rv_b3}
        out.append(ForwardRow(r.symbol, int(r.ref_at.timestamp()), r.rv_har, base, r.half80, r.half95,
                              r.realized_rv, r.realized_r))  # fmt: skip
    return out


def _fwd_json(f: ForwardResult) -> dict[str, object]:
    return {
        "rows": f.rows, "days": f.days, "qlike": f.qlike, "cover": {str(a): f.cover.get(a) for a in LEVELS},
        "dm": [{"baseline": d.baseline, "meanD": d.mean_d, "t": d.t, "p": d.p} for d in f.dm], "pHolm": f.p_holm,
    }  # fmt: skip


def main(argv: list[str] | None = None) -> int:
    p = base_parser("H1 흔들림 · 범위(사전등록 vol-range@3 — 1차 판정 · 전진 시험 · 동결 재생)")
    p.add_argument("--prereg", default=str(DEFAULT_PREREG), help="사전등록 TOML")
    p.add_argument("--market", choices=("crypto", "kr", "all"), default="all")
    p.add_argument("--no-report", action="store_true", help="리포트 파일을 쓰지 않는다")
    args = p.parse_args(argv)
    log = logger(JOB)
    stage = stage_logger(log, JOB)

    def replay(
        eng: Engine,
        markets: tuple[str, ...],
        raw: Mapping[str, Mapping[str, OhlcvSeries]],
        build: Mapping[str, Callable[[Mapping[str, OhlcvSeries], datetime], VolPanel]],
        mv: str,
        now: datetime,
    ) -> int:
        """동결 재생(@3) — 예측이 없는 기준 봉(맥이 잠든 주말 등)을 그 봉까지의 패널 · 같은 코드로 다시 만든다.

        같은 코드 = 그 봉 시각에 돌던 시험 실행의 커밋과 지금 디스크의 예측 코드가 같을 때만(`code_changed_since`).
        이미 쓴 행은 건드리지 않는다."""
        have_rows = load_predictions(eng, KEY, open_only=False)
        done = 0
        skipped = 0
        changed: dict[str, bool] = {}  # 적합 커밋 → 그 뒤 예측 코드가 바뀌었나(커밋마다 git 한 번)
        for m in markets:
            dates = build[m](raw[m], now).dates
            have = {int(r.ref_at.timestamp()) for r in have_rows if r.market == m}
            for i in replay_bars(dates, have, int(REGISTERED_AT.timestamp()), int(now.timestamp())):
                at = datetime.fromtimestamp(int(dates[i]), UTC)
                then = model_version_at(eng, KEY, at)
                if then is not None and then not in changed:
                    changed[then] = code_changed_since(then)
                if then is None or changed[then]:  # 같은 커밋이라도 디스크가 다르면 막는다
                    skipped += 1
                    continue
                rows_t = [
                    r for c in live_cells(prepare(build[m](raw[m], at)), mv, now) for r in c.rows if r.ref_at == at
                ]
                done += save_new_predictions(eng, KEY, rows_t)
        log.info("동결 재생", extra={"fields": {"job": JOB, "rows": done, "skipped_code_changed": skipped}})
        return done

    def body() -> int:
        eng = engine()
        as_of = parse_as_of(args.as_of)
        now = datetime.now(UTC)
        sha = _git_sha()
        mv = f"{KEY}+{sha}"
        if not args.dry_run:
            new = _register(eng, Path(args.prereg), sha)
            register_model(eng, mv, "vol_range", {"prereg": KEY, "model": "har-rv-log-pooled"})
            log.info("사전등록", extra={"fields": {"job": JOB, "key": KEY, "new": new}})
        markets = ("crypto", "kr") if args.market == "all" else (args.market,)
        raw = {m: load_ohlcv_series(eng, "upbit", "1h") if m == "crypto" else load_ohlcv_series(eng, "kis", "1d")
               for m in markets}  # fmt: skip
        stage("load")
        build = {"crypto": crypto_panel, "kr": kr_panel}
        hist_end = min(as_of, HISTORY_END)
        hist = run_history({m: build[m](raw[m], hist_end) for m in markets})
        stage("history")
        now_preps = {m: prepare(build[m](raw[m], as_of)) for m in markets}
        stage("panel")

        # 채점 → 오늘 예측
        open_rows = load_predictions(eng, KEY, open_only=True)
        closed = [x for m in markets for x in score_open(now_preps[m], open_rows, now)]
        live: list[LiveCell] = [c for m in markets for c in live_cells(now_preps[m], mv, now)]
        written = 0
        if not args.dry_run:
            written += save_scored(eng, KEY, closed)
            written += save_new_predictions(eng, KEY, [r for c in live for r in c.rows])
            written += replay(eng, markets, raw, build, mv, now)
        stage("forward")

        # 판정 — 1차는 한 번 정해지면 그대로, 판정 날짜는 지난 것 중 안 한 첫 번째
        prev = previous(eng, KEY, as_of)
        all_rows = load_predictions(eng, KEY, open_only=False) if not args.dry_run else open_rows
        status: dict[tuple[str, int], tuple[str, str | None]] = {}
        looks: dict[tuple[str, int], int] = {}
        forward: dict[tuple[str, int], ForwardResult] = {}
        for c in hist.cells:
            k = (c.market, c.horizon)
            before = prev.get(k)
            st: tuple[str, str | None] = (c.status, c.reason)
            if before is not None and before.status in ("forward", "pass", "fail"):
                st = (before.status, before.reason)
            status[k] = st
            looks[k] = before.looks_done if before else 0
            forward[k] = forward_result(c.market, c.horizon, forward_rows(all_rows, c.market, c.horizon))
        today = (as_of + _KST).date()
        due = {k: look_due(today, n) for k, n in looks.items()}
        look = min((v for v in due.values() if v is not None), default=None)
        if look is not None:
            # 판정 표본 = 판정 날짜 전 기준 봉(늦게 돌아도 같다, @3)
            cut = look_cutoff(look)
            for m, h in forward:
                forward[(m, h)] = forward_result(m, h, forward_rows(all_rows, m, h, cut))
            pending = {f"{m}:{h}": forward[(m, h)] for (m, h), s in status.items() if s[0] == "forward"}
            for kk, verdict in forward_judge(pending, look).items():
                m, h = kk.split(":")
                status[(m, int(h))] = verdict
            for k in looks:
                looks[k] = look + 1
            log.info("판정 날짜", extra={"fields": {"job": JOB, "look": look, "cells": list(pending)}})

        rows: list[TestRow] = []
        live_by = {(c.market, c.horizon): c for c in live}
        for c in hist.cells:
            k = (c.market, c.horizon)
            lc = live_by.get(k)
            params: dict[str, object] | None = None
            if lc is not None and lc.fit is not None:
                params = {"fit": lc.fit.to_json(), "q80": lc.q[0] if lc.q else None, "q95": lc.q[1] if lc.q else None}
            rows.append(
                TestRow(
                    c.market, c.horizon, mv, status[k][0], status[k][1],
                    datetime.fromtimestamp(c.window[0], UTC) if c.window[0] else None,
                    datetime.fromtimestamp(c.window[1], UTC) if c.window[1] else None,
                    c.rows, c.days, c.excluded_nonpos, c.qlike, c.p_holm, c.cover.get(0.80), c.cover.get(0.95),
                    c.cover_rows, {str(y): {str(a): v for a, v in d.items()} for y, d in c.cover_by_year.items()},
                    c.placebo_pass, _fwd_json(forward[k]), looks[k], params, status[k][0] == "pass",
                )
            )  # fmt: skip
            log.info(
                "칸",
                extra={"fields": {"job": JOB, "market": c.market, "horizon": c.horizon, "status": status[k][0],
                                  "reason": status[k][1], "eval_rows": c.rows, "forward_rows": forward[k].rows,
                                  "live": len(lc.rows) if lc else 0}},
            )  # fmt: skip
        if not args.dry_run:
            written += save_test(eng, KEY, as_of, rows, now)
        if not args.no_report:
            neg = now_preps["kr"].panel.negative_gk if "kr" in now_preps else 0
            path = REPORTS / f"vol-range-{KEY.replace('@', '-')}-{report_day(as_of)}.md"
            path.write_text(render_report(KEY, sha, as_of, hist, status, forward, live, neg), encoding="utf-8")
            log.info("리포트", extra={"fields": {"job": JOB, "path": str(path)}})
        return written if not args.dry_run else len(rows) + sum(len(c.rows) for c in live)

    return run_job(JOB, args, body)


if __name__ == "__main__":
    raise SystemExit(main())
