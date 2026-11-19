"""밸류에이션 밴드 적립 — 사전등록 band-accumulation@2 를 등록하고 매주 판정 · 검산 · 리포트
(FC-REQ-029 · F003 v2 순서 1).

매일 돌아도 같은 결정일(이번 주 월요일) 행을 덮어쓸 뿐이다. 서버 plan 은 뷰 `v_accumulation_band` 를 읽는다.
"""

from __future__ import annotations

import json
import math
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from salt_forecast.domain.accumulation import BTC_BANDS, KOSPI_BANDS, Band, Kimchi, kimchi_premium
from salt_forecast.domain.calendar import report_day
from salt_forecast.ingest import coinmetrics, ecb, ecos
from salt_forecast.jobs._common import base_parser, logger, parse_as_of, run_job
from salt_forecast.jobs.target_weight import register_prereg
from salt_forecast.scoring.accumulation import AssetResult, Inputs, render_report, run
from salt_forecast.store.accumulation import save
from salt_forecast.store.db import engine
from salt_forecast.store.prices import load_ohlcv_series
from salt_forecast.store.series import load_vintaged

JOB = "accumulation_band"
ROOT = Path(__file__).resolve().parents[3]
DEFAULT_PREREG = ROOT / "preregistration" / "2026-11-19-band-accumulation-v2.toml"
REPORTS = ROOT / "reports"


def _ts(epoch: int | None) -> datetime | None:
    return None if epoch is None else datetime.fromtimestamp(epoch, tz=UTC)


BANDS: dict[str, tuple[Band, ...]] = {"btc": BTC_BANDS, "kospi": KOSPI_BANDS}


def bands_json(asset: str) -> str:
    """사전등록 밴드 표 — 마지막 줄 `below` 는 무한이라 null(JSON 에 inf 가 없다)."""
    rows = [
        {"key": b.key, "below": None if math.isinf(b.below) else b.below, "multiplier": b.multiplier}
        for b in BANDS[asset]
    ]
    return json.dumps(rows)


def to_row(key: str, r: AssetResult, computed_at: datetime) -> dict[str, Any]:
    rd, s = r.reading, r.stats
    return {
        "asset": r.asset,
        "plan_week": _ts(r.plan_week),
        "prereg_key": key,
        "indicator": r.indicator,
        "indicator_value": None if rd is None else rd.value,
        "percentile": None if rd is None else rd.percentile,
        "estimated": False if rd is None else rd.estimated,
        "basis_observed": None if rd is None else _ts(rd.basis_observed),
        "secondary_value": None if rd is None else rd.secondary,
        "band_key": None if r.band is None else r.band.key,
        "band_multiplier": None if r.band is None else r.band.multiplier,
        "gate_passed": r.gate.passed,
        "blocked_reason": r.gate.reason,
        "multiplier": r.multiplier,
        "closed_weeks": s.n,
        "excess": s.excess,
        "ci_low": s.ci_low,
        "ci_high": s.ci_high,
        "years_total": s.years_total,
        "years_positive": s.years_positive,
        "window_from": _ts(s.window_from),
        "window_to": _ts(s.window_to),
        "failure_cases": json.dumps(
            [
                {
                    "decidedAt": datetime.fromtimestamp(c.t, tz=UTC).isoformat(),
                    "kind": c.kind,
                    "band": c.band,
                    "multiplier": c.multiplier,
                    "return52w": c.ret,
                }
                for c in r.cases
            ]
        ),
        "failure_count": r.case_count,
        "kimchi_premium": None if r.kimchi is None else r.kimchi.premium,
        "kimchi_as_of": None if r.kimchi is None else _ts(r.kimchi.as_of),
        "computed_at": computed_at,
        "bands": bands_json(r.asset),
    }


def main(argv: list[str] | None = None) -> int:
    p = base_parser("밸류에이션 밴드 적립 판정 · 검산(사전등록 실행)")
    p.add_argument("--prereg", default=str(DEFAULT_PREREG), help="사전등록 TOML")
    p.add_argument("--no-report", action="store_true", help="리포트 파일을 쓰지 않는다")
    args = p.parse_args(argv)
    log = logger(JOB)

    def body() -> int:
        eng = engine()
        as_of = parse_as_of(args.as_of)
        key, sha = register_prereg(eng, Path(args.prereg), dry_run=args.dry_run, log=log, job=JOB)
        cm = load_vintaged(eng, coinmetrics.SOURCE)
        ec = load_vintaged(eng, ecos.SOURCE)
        fx = load_vintaged(eng, ecb.SOURCE).get(ecb.SERIES)
        up = load_ohlcv_series(eng, "upbit", "1d", ["KRW-BTC"]).get("KRW-BTC")
        bn = load_ohlcv_series(eng, "binance", "1d", ["BTCUSDT"]).get("BTCUSDT")

        def kimchi(t: int) -> Kimchi | None:
            if up is None or bn is None or fx is None:
                return None
            return kimchi_premium(t, (up.available_at, up.close), (bn.available_at, bn.close), fx)

        inputs = Inputs(
            mvrv=cm[coinmetrics.series_id("CapMVRVCur")],
            mcap=cm[coinmetrics.series_id("CapMrktCurUSD")],
            btc_price=cm[coinmetrics.series_id("PriceUSD")],
            kospi_per=ec[ecos.KOSPI_PER],
            kospi_index=ec[ecos.KOSPI_INDEX],
            kospi_dividend=ec.get(ecos.KOSPI_DIVIDEND_YIELD),
            kimchi=kimchi,
        )
        results = run(inputs, as_of)
        now = datetime.now(UTC)
        rows = [to_row(key, r, now) for r in results]
        for r in results:
            log.info(
                "판정",
                extra={"fields": {"job": JOB, "asset": r.asset, "gate": r.gate.passed, "reason": r.gate.reason,
                                  "band": None if r.band is None else r.band.key, "multiplier": r.multiplier,
                                  "closed": r.stats.n, "excess": r.stats.excess, "ci_low": r.stats.ci_low}},
            )  # fmt: skip
        if not args.no_report:
            path = REPORTS / f"band-accumulation-{key.replace('@', '-')}-{report_day(as_of)}.md"
            path.write_text(render_report(key, sha, as_of, results), encoding="utf-8")
        if args.dry_run:
            return len(rows)
        return save(eng, rows)

    return run_job(JOB, args, body)


if __name__ == "__main__":
    raise SystemExit(main())
