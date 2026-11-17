"""단타 방향 확률 — 사전등록 short-direction@3(전진 시험) 실행(FC-REQ-028 FR-1 · FR-4 · F017 v2 단계 5).

- `test`(매일): 등록 → 전 이력 walk-forward(칸마다 마지막 적합 · 본 기간 검산 참고) → 라이브(등록 뒤 예측) 지표 →
  **판정 날짜에만** 판정(`forward_judge`) · 통과 칸 소등 점검 → forecast.short_horizon_test · 리포트.
- `live`(매시 — 1시간봉 증분 뒤): 만료 예측 채점 → 시험 칸 전부(forward · pass) 마지막 격자 행 예측 p · p_ref.
  화면 확률은 pass 칸만(뷰 renderable) — forward 칸은 쌓기만 한다.
"""

from __future__ import annotations

import hashlib
import json
import tomllib
from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from typing import Any

import numpy as np
from sqlalchemy import Engine

from salt_forecast.domain.base_rate import CRYPTO_ROUND_TRIP, kr_round_trip
from salt_forecast.domain.calendar import report_day
from salt_forecast.domain.series import DAY
from salt_forecast.domain.short_direction import (
    CRYPTO_SPECS,
    HOUR,
    KEY,
    KR_SPEC,
    REPLAY_CAP_S,
    Fit,
    ForwardMetrics,
    ForwardSample,
    forward_judge,
    forward_metrics,
    is_look,
    is_realtime,
    live_track,
    live_underperforms,
    look_cutoff,
    may_write,
    replay_hours,
    written_in_time,
)
from salt_forecast.jobs._common import base_parser, logger, parse_as_of, run_job, stage_logger
from salt_forecast.jobs.code_guard import code_changed_since
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
from salt_forecast.store.kr_stock import krx_closed_dates, krx_open_dates
from salt_forecast.store.predictions import register_model
from salt_forecast.store.prices import load_ohlcv_series
from salt_forecast.store.rule_ic import Registration, register
from salt_forecast.store.short_direction import (
    ActiveCell,
    CellTestRow,
    LiveOutcome,
    PredictionRow,
    active_cells,
    first_run,
    insert_new_predictions,
    last_run,
    live_outcomes,
    previous_status,
    save_predictions,
    save_test,
    score_due,
    written_as_of,
)

JOB = "short_direction"
DEFAULT_PREREG = ROOT / "preregistration" / "2026-11-16-short-direction-5.toml"
HOURS = {"1h": 1, "4h": 4, "1d": 24}
KST = timedelta(hours=9)


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


def sample_of(market: str, live: list[LiveOutcome]) -> ForwardSample:
    """채점 끝난 라이브 예측 → 판정 표본. p_ref 가 없는 행(옛 키)은 없다 — 키로 거른 뒤라. 비용은 시장 규칙 그대로."""
    keep = [x for x in live if x.p_ref is not None]
    p = np.array([x.p_up for x in keep])
    p_ref = np.array([x.p_ref for x in keep], dtype=np.float64)
    r = np.array([x.realized for x in keep])
    if market == "crypto":
        cost = np.full(r.size, CRYPTO_ROUND_TRIP)
    else:
        cost = np.array([kr_round_trip((x.expires_at + KST).date(), x.ref_price) for x in keep])
    day = np.array([int(x.as_of.timestamp()) // DAY for x in keep], dtype=np.int64)
    return ForwardSample(p, p_ref, (r > 0).astype(np.float64), r, cost, day)


def main(argv: list[str] | None = None) -> int:
    p = base_parser("단타 방향 확률(사전등록 short-direction@4 전진 시험 · 동결 재생)")
    p.add_argument("command", choices=("test", "live", "replay"))
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
        prev = previous_status(eng, KEY, as_of)
        last = last_run(eng, KEY, as_of)
        look = is_look((as_of + KST).date().isoformat(), None if last is None else (last + KST).date().isoformat())
        lives: dict[str, list[LiveOutcome]] = {}
        forward: dict[str, ForwardMetrics] = {}
        realtime: dict[str, ForwardMetrics] = {}  # 실시간 행만 — 민감도(판정 아님)
        for c in run.cells:
            r = c.result
            if r.status == "not_tested":
                continue
            k = f"{r.market}:{r.horizon}"
            spec = CRYPTO_SPECS[r.horizon] if r.market == "crypto" else KR_SPEC
            outs = live_outcomes(eng, r.market, r.horizon, KEY)
            if look is not None:  # 판정 표본 = 판정 날짜 전에 낸 예측(늦게 돌아도 같다, @4)
                cut = look_cutoff(look)
                outs = [x for x in outs if x.as_of.timestamp() < cut]
            lives[k] = outs
            forward[k] = forward_metrics(sample_of(r.market, outs), spec.boot_block)
            rt = [x for x in outs if is_realtime(r.market, int(x.as_of.timestamp()), int(x.expires_at.timestamp()),
                                                 int(x.available_at.timestamp()))]  # fmt: skip
            realtime[k] = forward_metrics(sample_of(r.market, rt), spec.boot_block)
            # 판정 날짜에 정해진 pass · fail 은 그대로 — 판정은 날짜에만(사전등록 [looks])
            before = prev.get((r.market, r.horizon))
            if before is not None and before[0] in ("pass", "fail"):
                r.status, r.reason = before
        if look is not None:
            pending = {k: m for k, m in forward.items() if k in {f"{c.result.market}:{c.result.horizon}" for c in
                       run.cells if c.result.status == "forward"}}  # fmt: skip
            verdict = forward_judge(pending, look)
            for c in run.cells:
                k = f"{c.result.market}:{c.result.horizon}"
                if k in verdict:
                    c.result.status, c.result.reason = verdict[k]
        rows: list[CellTestRow] = []
        for c in run.cells:
            r = c.result
            k = f"{r.market}:{r.horizon}"
            syms = run.symbols.get(r.market, ())
            misses = [
                {"asOf": datetime.fromtimestamp(w, tz=UTC).isoformat(), "symbol": syms[s], "pUp": pu, "realized": rr}
                for w, s, pu, rr in r.misses
            ]
            origin, calls, hits, ups = "backtest", r.confident, r.confident_hits, r.always_up_hits
            live = lives.get(k, [])
            if live:
                spec = CRYPTO_SPECS[r.horizon] if r.market == "crypto" else KR_SPEC
                pp = np.array([x.p_up for x in live])
                rr = np.array([x.realized for x in live])
                days = np.array([int(x.as_of.timestamp()) // DAY for x in live], dtype=np.int64)
                if r.status == "pass" and live_underperforms(pp, (rr > 0).astype(np.float64), days, spec.boot_block):
                    r.status, r.reason = "fail", "live_underperforms"
                track = live_track(pp, rr)
                if track is not None:  # 라이브가 300 을 넘으면 화면 성적은 라이브만(본 기간 검산과 합치지 않는다)
                    origin, calls, hits, ups = "live", track.calls, track.hits, track.always_up
                    misses = [
                        {"asOf": live[i].as_of.isoformat(), "symbol": live[i].symbol, "pUp": live[i].p_up,
                         "realized": live[i].realized}
                        for i in track.misses
                    ]  # fmt: skip
            params = None
            if c.fit is not None:
                params = c.fit.to_json()
                if c.ref_fit is not None:
                    params["ref"] = c.ref_fit.to_json()
            rows.append(
                CellTestRow(
                    r.market, r.horizon, r.status, r.reason, r.window, r.rows, r.bss, r.bss_lo, r.bss_hi,
                    None, r.bss_persistence, r.ece, origin, calls, hits, ups, r.hit_diff_lo, r.hit_diff_hi,
                    r.net_mean, float("nan"), float("nan"), [[n, pm, ym] for n, pm, ym in r.reliability], misses,
                    {kk: list(v) for kk, v in r.z_quantiles.items()}, params, r.status == "pass", r.bss_climatology,
                )
            )  # fmt: skip
            m = forward.get(k)
            log.info(
                "칸",
                extra={"fields": {"job": JOB, "market": r.market, "horizon": r.horizon, "status": r.status,
                                  "reason": r.reason, "live_rows": m.rows if m else 0, "live_days": m.days if m else 0,
                                  "look": look}},
            )  # fmt: skip
        written = len(rows) if args.dry_run else save_test(eng, KEY, mv, as_of, rows, datetime.now(UTC))
        if not args.no_report:
            path = REPORTS / f"short-direction-{KEY.replace('@', '-')}-{report_day(as_of)}.md"
            path.write_text(render_report(KEY, sha, as_of, run, forward, look, realtime), encoding="utf-8")
            log.info("리포트", extra={"fields": {"job": JOB, "path": str(path)}})
        return written

    def predict_at(
        eng: Engine, cells: list[ActiveCell], as_of: datetime, cache: dict[str, Any], closed: set[date]
    ) -> list[PredictionRow]:
        """칸들의 as_of 시점 예측 — 실시간과 재생이 같은 함수를 쓴다.

        입력은 그 시각 전 적합 · 그 시각까지 알 수 있던 봉뿐."""
        preds: list[PredictionRow] = []
        crypto_cp = None
        kr_cp = None
        for c in cells:
            fit = Fit.from_json(c.live_params)
            ref_raw = c.live_params.get("ref")
            ref = Fit.from_json(ref_raw) if isinstance(ref_raw, dict) else None  # pyright: ignore[reportUnknownArgumentType]
            if c.market == "crypto":
                if crypto_cp is None:
                    if "crypto" not in cache:
                        cache["crypto"] = load_ohlcv_series(eng, "upbit", "1h")
                    start = int((as_of - timedelta(hours=LIVE_HOURS)).timestamp())
                    crypto_cp = crypto_panel(cache["crypto"], start, as_of)
                h = HOURS[c.horizon]
                out = live_predictions(crypto_cp, "crypto", c.horizon, h, fit, c.z_quantiles, ref)
                preds += [
                    PredictionRow(x.symbol, x.horizon, x.as_of, c.model_version, "crypto", x.p_up, x.q10, x.q50, x.q90,
                                  x.ref_price, x.invalidation, x.as_of + timedelta(seconds=h * HOUR),
                                  None if np.isnan(x.p_ref) else x.p_ref)
                    for x in out
                ]  # fmt: skip
            else:
                if kr_cp is None:
                    if "kr" not in cache:
                        cache["kr"] = load_ohlcv_series(eng, "kis", "1d")
                    start = int((as_of - timedelta(days=KR_LIVE_SESSIONS * 7 // 5 + 30)).timestamp())
                    kr_cp, _ = kr_panel(cache["kr"], start, as_of)
                out = live_predictions(kr_cp, "kr", c.horizon, 1, fit, c.z_quantiles, ref)
                preds += [
                    PredictionRow(x.symbol, x.horizon, x.as_of, c.model_version, "kr", x.p_up, x.q10, x.q50, x.q90,
                                  x.ref_price, x.invalidation, next_kr_close(x.as_of, closed),
                                  None if np.isnan(x.p_ref) else x.p_ref)
                    for x in out
                ]  # fmt: skip
        return preds

    def live() -> int:
        eng = engine()
        as_of = parse_as_of(args.as_of)
        now = datetime.now(UTC)
        scored = 0 if args.dry_run else score_due(eng, now)
        cells = [c for c in active_cells(eng, KEY, as_of) if args.market in ("all", c.market)]
        # 재생과 같은 코드 가드 — 그 적합의 커밋 뒤 예측 코드가 바뀌었으면 옛 이름표로 쓰지 않는다(2026-11-17).
        # 바뀐 코드가 머지되면 실행 트리 동기화가 곧바로 다시 적합해(ops/sync-run.sh) 다음 회차부터 새 이름표로 쓴다
        changed = {mv: code_changed_since(mv) for mv in {c.model_version for c in cells}}
        blocked = [c for c in cells if not may_write(changed[c.model_version])]
        cells = [c for c in cells if c not in blocked]
        log.info(
            "예측 칸",
            extra={"fields": {"job": JOB, "cells": [f"{c.market}:{c.horizon}:{c.status}" for c in cells],
                              "scored": scored, "skipped_code_changed": len(blocked)}},
        )  # fmt: skip
        if not cells:
            return scored
        closed = set(krx_closed_dates(eng)) if any(c.market == "kr" for c in cells) else set[date]()
        preds = predict_at(eng, cells, as_of, {}, closed)
        # 결과를 조금이라도 알 수 있는 시각이면 쓰지 않는다(늦은 회차 · 국내 장 열린 뒤 — 놓친 시각은 replay 몫)
        t_now = int(now.timestamp())
        late = [
            x
            for x in preds
            if not written_in_time(x.market, int(x.as_of.timestamp()), int(x.expires_at.timestamp()), t_now)
        ]
        preds = [x for x in preds if x not in late]
        if late:
            log.info("늦은 예측 버림", extra={"fields": {"job": JOB, "late": len(late), "kept": len(preds)}})
        if args.dry_run:
            return scored + len(preds)
        return scored + save_predictions(eng, KEY, preds, now)

    def replay() -> int:
        """동결 재생(@4) — 맥이 잠든 동안 놓친 기준 시각 전부를 다시 만든다.

        그 시각 전 적합 · 그 시각까지의 봉 · 같은 코드(model_version)로만.

        이미 쓴 행은 건드리지 않는다. available_at = 지금(쓴 시각) — 실시간 행과 언제든 구분된다."""
        eng = engine()
        now = datetime.now(UTC)
        reg = first_run(eng, KEY)
        if reg is None:
            return 0
        t_now = int(now.timestamp())
        since = max(reg, now - timedelta(seconds=REPLAY_CAP_S))
        cache: dict[str, Any] = {}
        closed = set(krx_closed_dates(eng))
        total = 0
        skipped_code = 0
        changed: dict[str, bool] = {}  # 적합의 model_version → 그 뒤 예측 코드가 바뀌었나(커밋마다 git 한 번)
        targets: list[tuple[str, datetime, int]] = []  # (시장, 계산 시각, 기대 기준 시각)
        if args.market in ("crypto", "all"):
            missing: set[int] = set()
            for h in HOURS:
                done = {int(x.timestamp()) for x in written_as_of(eng, KEY, "crypto", h, since)}
                missing |= set(replay_hours(int(reg.timestamp()), done, t_now))
            # 실시간 회차와 같은 :02 에 계산한다 — 그 시각까지 마감된 봉만 본다
            targets += [("crypto", datetime.fromtimestamp(t + 120, UTC), t) for t in sorted(missing)]
        if args.market in ("kr", "all"):
            done_kr = written_as_of(eng, KEY, "kr", "1d", since)
            for d in krx_open_dates(eng, (now + KST).date()):
                session = datetime(d.year, d.month, d.day, tzinfo=UTC)  # 국내 예측의 기준 시각(패널 행)
                at = session + timedelta(hours=7, minutes=30)  # 16:30 KST — 그날 봉이 공개된 뒤
                if since <= at and at < now and session not in done_kr:
                    targets.append(("kr", at, int(session.timestamp())))
        for market, at, expect in targets:
            cells = [c for c in active_cells(eng, KEY, at) if c.market == market]
            for c in cells:
                if c.model_version not in changed:
                    changed[c.model_version] = code_changed_since(c.model_version)
            ok = [c for c in cells if may_write(changed[c.model_version])]
            skipped_code += len(cells) - len(ok)
            if not ok:
                continue
            preds = predict_at(eng, ok, at, cache, closed)
            # 실시간 기록 창이 지난 행만 — 창이 아직 열린 시각은 live 몫
            preds = [
                x
                for x in preds
                if int(x.as_of.timestamp()) == expect
                and not written_in_time(x.market, int(x.as_of.timestamp()), int(x.expires_at.timestamp()), t_now)
            ]
            total += len(preds) if args.dry_run else insert_new_predictions(eng, KEY, preds, now)
        log.info(
            "동결 재생",
            extra={
                "fields": {"job": JOB, "targets": len(targets), "rows": total, "skipped_code_changed": skipped_code}
            },
        )
        return total

    # 작업 이름을 둘로 — 매시 게이트(`due --job short_direction_live`)와 매일 시험이 서로의 마지막 성공을 보지 않게
    body = {"test": test, "live": live, "replay": replay}[args.command]
    return run_job(JOB if args.command == "test" else f"{JOB}_{args.command}", args, body)


if __name__ == "__main__":
    raise SystemExit(main())
