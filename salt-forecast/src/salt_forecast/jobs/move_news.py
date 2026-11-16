"""H3 큰 움직임 × 소식 — 사전등록 move-news@3 실행(@1 + 늦은 사건 동결 재생 · FC-REQ-028 FR-9 · F017 v4 순서 4).

매일(daily.sh, 국내 일봉 옮긴 뒤): 등록 → 시장마다 패널 · 소식 → 기록된 사건 채점 → 새 사건 기록(라벨 전) →
과거 참고 검정 · 전진 검정(판정 날짜가 지났으면 그 판정) → forecast.move_news_test · 리포트.
"""

from __future__ import annotations

import hashlib
import json
import tomllib
from datetime import UTC, datetime, timedelta
from pathlib import Path

from salt_forecast.domain.calendar import report_day
from salt_forecast.domain.move_news import (
    ALPHA_PER_LOOK,
    HORIZONS,
    KEY,
    LATE_AFTER_AWAKE_S,
    LOOKS,
    REGISTERED_AT,
    CellRun,
    awake_since,
    judge,
    look_cutoff,
    look_due,
)
from salt_forecast.domain.news_kind import from_prereg
from salt_forecast.jobs._common import base_parser, logger, parse_as_of, run_job, stage_logger
from salt_forecast.jobs.rule_ic import REPORTS, ROOT, _git_sha  # pyright: ignore[reportPrivateUsage]
from salt_forecast.scoring.move_news import (
    MarketData,
    build,
    detail,
    forward_sample,
    history_sample,
    new_events,
    render_report,
    run_cell,
    score_events,
)
from salt_forecast.store.db import engine
from salt_forecast.store.move_news import EventRow, TestRow, beats, load_events, previous, save_events, save_tests
from salt_forecast.store.news_reaction import load_crypto_titles, load_kr_titles
from salt_forecast.store.prices import load_ohlcv_series
from salt_forecast.store.rule_ic import Registration, register

JOB = "move_news"
DEFAULT_PREREG = ROOT / "preregistration" / "2026-11-16-move-news-3.toml"
DICT_PREREG = ROOT / "preregistration" / "2026-11-12-news-reaction-2.toml"  # 제목 거르기 = news-reaction@2 exclude
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


def _rows(cells: list[CellRun], origin: str, looks: int) -> list[TestRow]:
    out: list[TestRow] = []
    for c in cells:
        for r in c.tests:
            st, why = c.status.get(r.test, ("reference", None))
            if r.test == "diff":
                n_ev, n_days = c.news.events + c.quiet.events, min(c.news.days, c.quiet.days)
            else:
                g = c.news if r.test == "news_up" else c.quiet
                n_ev, n_days = g.events, g.days
            out.append(
                TestRow(
                    c.market, c.horizon, r.test, origin, st, why,
                    n_ev, n_days,
                    r.stat, r.t, r.p, r.p_holm, c.placebo_q95, c.placebo_pass, c.robust_same_sign, detail(c), looks,
                )
            )  # fmt: skip
    return out


def main(argv: list[str] | None = None) -> int:
    p = base_parser("H3 큰 움직임 × 소식(사전등록 move-news@3 — 전진 시험 · 늦은 사건 재생)")
    p.add_argument("--prereg", default=str(DEFAULT_PREREG), help="사전등록 TOML")
    p.add_argument("--market", choices=("crypto", "kr", "all"), default="all")
    p.add_argument("--no-report", action="store_true", help="리포트 파일을 쓰지 않는다")
    args = p.parse_args(argv)
    log = logger(JOB)
    stage = stage_logger(log, JOB)

    def body() -> int:
        eng = engine()
        as_of = parse_as_of(args.as_of)
        now = datetime.now(UTC)
        sha = _git_sha()
        if not args.dry_run:
            new = _register(eng, Path(args.prereg), sha)
            log.info("사전등록", extra={"fields": {"job": JOB, "key": KEY, "new": new}})
        d = from_prereg(tomllib.loads(DICT_PREREG.read_text(encoding="utf-8")))
        markets = ("kr", "crypto") if args.market == "all" else (args.market,)
        data: dict[str, MarketData] = {}
        for m in markets:
            if m == "kr":
                data[m] = build(m, load_ohlcv_series(eng, "kis", "1d"), load_kr_titles(eng, as_of=as_of), d, as_of)
            else:
                data[m] = build(
                    m, load_ohlcv_series(eng, "upbit", "1d"), load_crypto_titles(eng, as_of=as_of), d, as_of
                )
            stage(m)

        written = 0
        recorded: dict[str, int] = {}
        stored: dict[str, list[EventRow]] = {}
        since = int(REGISTERED_AT.timestamp())
        # 늦은 사건(맥이 잠든 날)은 깨어난 지 2시간 뒤에만 — 서버 크롤러가 잠든 동안 기사를 메운 뒤(@3)
        t_now = int(now.timestamp())
        woke = awake_since(beats(eng, "ingest_kr_minutes", now - timedelta(days=2)), t_now)
        late_ok = t_now - woke >= LATE_AFTER_AWAKE_S
        for m, md in data.items():
            have = load_events(eng, KEY, m)
            known = {(e.symbol, int(e.ref_at.timestamp())) for e in have}
            fresh = new_events(md, known, since, now, late_ok)
            closed = score_events(md, have, now)
            recorded[m] = len(fresh)
            if not args.dry_run:
                written += save_events(eng, KEY, fresh + closed)
            merged = {(e.symbol, e.ref_at): e for e in have}
            merged.update({(e.symbol, e.ref_at): e for e in closed + fresh})
            stored[m] = list(merged.values())
        stage("record")

        reference = [run_cell(md, h, history_sample(md, h), placebo=True) for md in data.values() for h in HORIZONS]
        forward = [run_cell(md, h, forward_sample(md, stored[md.market], h), placebo=True)
                   for md in data.values() for h in HORIZONS]  # fmt: skip
        stage("tests")

        prev = previous(eng, KEY, as_of)
        done = max((n for _, _, n in prev.values()), default=0)
        look = look_due((as_of + _KST).date(), done)
        if look is not None:
            # 판정 표본 = 판정 날짜 전 봉(늦게 돌아도 같다, @3)
            cut = look_cutoff(look)
            forward = [run_cell(md, h, forward_sample(md, stored[md.market], h, cut), placebo=True)
                       for md in data.values() for h in HORIZONS]  # fmt: skip
            judge(forward, ALPHA_PER_LOOK, look == len(LOOKS) - 1)
            done = look + 1
            log.info("판정 날짜", extra={"fields": {"job": JOB, "look": look}})
        for c in forward:
            for r in c.tests:
                before = prev.get((c.market, c.horizon, r.test))
                if look is None:
                    c.status[r.test] = (before[0], before[1]) if before else ("forward", None)
                elif before is not None and before[0] in ("pass", "fail"):
                    c.status[r.test] = (before[0], before[1])  # 정해진 판정은 그대로
        for c in reference:
            for r in c.tests:
                c.status[r.test] = ("reference", "below_min" if r.below_min else None)
            log.info(
                "참고 칸",
                extra={"fields": {"job": JOB, "market": c.market, "horizon": c.horizon, "news": c.news.events,
                                  "quiet": c.quiet.events, "days": c.moves.days}},
            )  # fmt: skip
        rows = _rows(reference, "reference", done) + _rows(forward, "forward", done)
        if not args.dry_run:
            written += save_tests(eng, KEY, as_of, rows, now)
        if not args.no_report:
            windows = {m: (int(md.dates[0]), int(md.dates[-1])) for m, md in data.items() if md.dates.size}
            path = REPORTS / f"move-news-{KEY.replace('@', '-')}-{report_day(as_of)}.md"
            path.write_text(render_report(KEY, sha, as_of, reference, forward, recorded, windows), encoding="utf-8")
            log.info("리포트", extra={"fields": {"job": JOB, "path": str(path)}})
        log.info("기록", extra={"fields": {"job": JOB, **{f"new_{m}": n for m, n in recorded.items()}}})
        return written if not args.dry_run else len(rows) + sum(recorded.values())

    return run_job(JOB, args, body)


if __name__ == "__main__":
    raise SystemExit(main())
