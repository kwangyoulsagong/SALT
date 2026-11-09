"""등락 분해 β · 평소 변동 σ — 국내 일봉 · 지수 일별 · 업비트 일봉 → forecast.move_beta (F016 단계 C · FC-REQ-027
FR-1~3).

서버는 `forecast.v_move_beta_export` 로 오늘 등락을 시장 · 업종 · 종목 몫으로 나누고(β), 카드 조건을 본다(σ).
as_of 는 UTC 자정 — 국내는 전 거래일 종가(16:00 KST 에 알게 된다)까지, 코인은 00:00 UTC 에 닫힌 일봉까지. 같은 날
다시 돌려도 같은 값(멱등).
"""

from __future__ import annotations

from datetime import UTC, datetime

from salt_forecast.config import Settings
from salt_forecast.domain.move_beta import MoveBetaWindow, crypto_move_beta, kr_move_beta
from salt_forecast.jobs._common import base_parser, logger, parse_as_of, run_job
from salt_forecast.jobs._data import load_kr
from salt_forecast.store.db import engine
from salt_forecast.store.move_beta import (
    MoveBetaRow,
    btc_betas_as_of,
    kr_index_daily,
    kr_index_membership,
    upsert_move_betas,
)
from salt_forecast.store.prices import load_close_series

JOB = "move_beta"


def main(argv: list[str] | None = None) -> int:
    args = base_parser("등락 분해 β · 평소 변동 σ").parse_args(argv)
    log = logger(JOB)

    def body() -> int:
        settings = Settings()  # pyright: ignore[reportCallIssue]
        window = MoveBetaWindow(
            settings.move_beta_window,
            settings.move_beta_min_sample,
            settings.move_sigma_window,
            settings.move_sigma_min_sample,
        )
        eng = engine()
        now = parse_as_of(args.as_of)
        as_of = datetime(now.year, now.month, now.day, tzinfo=UTC)
        t = int(as_of.timestamp())

        kr_series, _ = load_kr(eng, as_of)
        indices = {c: s.as_of(t) for c, s in kr_index_daily(eng).items()}
        membership = kr_index_membership(eng)
        rows: list[MoveBetaRow] = []
        for code, series in kr_series.items():
            m = membership.get(code)
            if m is None:
                continue
            market = indices.get(m.market_index) if m.market_index else None
            sector = indices.get(m.sector_index) if m.sector_index else None
            value = kr_move_beta(series.as_of(t), market, sector, window)
            rows.append(
                MoveBetaRow(
                    value, "kr_stock", m.market_index, m.sector_index if value.beta_sector is not None else None
                )
            )

        betas = btc_betas_as_of(eng, as_of)
        for symbol, series in load_close_series(eng, "upbit", "1d").items():
            rows.append(
                MoveBetaRow(crypto_move_beta(series.as_of(t), betas.get(symbol), window), "crypto", "KRW-BTC", None)
            )

        kr = [r for r in rows if r.asset_class == "kr_stock"]
        fields = {
            "job": JOB,
            "as_of": as_of.isoformat(),
            "kr": len(kr),
            "kr_beta": sum(1 for r in kr if r.value.beta_market is not None),
            "kr_sector_beta": sum(1 for r in kr if r.value.beta_sector is not None),
            "kr_sigma": sum(1 for r in kr if r.value.sigma_daily is not None),
            "crypto": len(rows) - len(kr),
            "crypto_beta": sum(1 for r in rows if r.asset_class == "crypto" and r.value.beta_market is not None),
            "indices": {c: int(s.available_at.size) for c, s in sorted(indices.items())},
            "sample": {
                r.value.symbol: [
                    round(r.value.beta_market or 0, 3),
                    round(r.value.beta_sector or 0, 3),
                    round(r.value.sigma_daily or 0, 4),
                ]
                for r in kr[:3]
            },
        }
        log.info("등락 분해 β · σ", extra={"fields": fields})
        return len(rows) if args.dry_run else upsert_move_betas(eng, rows, as_of, datetime.now(UTC))

    return run_job(JOB, args, body)


if __name__ == "__main__":
    raise SystemExit(main())
