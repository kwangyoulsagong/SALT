"""네이버 데이터랩 검색 관심 수집(F010 슬라이스 6 3차 · FC-REQ-017 · 사전등록 search-interest@1).

처음 보는 종목은 2016-01-01 부터 한 요청으로 백필하고, 있는 종목은 앞 60일을 겹쳐 받아 이어 붙인다
(`domain/search_interest.chain_link`). 키가 없으면 아무것도 하지 않고 성공으로 끝난다 — 키는 사용자가 넣는다.
하루 한도 1,000회 중 한 번 실행이 `--max-requests`(기본 400)를 넘지 않는다. 남은 종목은 다음 날 잇는다.
"""

from __future__ import annotations

from datetime import timedelta

import httpx

from salt_forecast.config import settings
from salt_forecast.domain.news_text import search_keyword
from salt_forecast.domain.search_interest import chain_link, fill_days
from salt_forecast.ingest import naver_datalab as dl
from salt_forecast.ingest.http import Pacer, SourceError
from salt_forecast.ingest.upbit import Pacer as UpbitPacer
from salt_forecast.ingest.upbit import UpbitDaily
from salt_forecast.jobs._common import base_parser, logger, parse_as_of, run_job, symbols_arg
from salt_forecast.store.db import engine
from salt_forecast.store.runs import mark_source
from salt_forecast.store.series import SeriesPoint, points_by_series, upsert_points

JOB = "ingest_search"
OVERLAP_DAYS = 60


def main(argv: list[str] | None = None) -> int:
    p = base_parser("네이버 데이터랩 검색 관심 수집")
    p.add_argument("--max-requests", type=int, default=400)
    args = p.parse_args(argv)
    log = logger(JOB)

    def body() -> int:
        cfg = settings()
        if cfg.naver_client_id is None or cfg.naver_client_secret is None:
            log.warning("네이버 키 없음 — 건너뜀", extra={"fields": {"job": JOB}})
            return 0
        cid, secret = cfg.naver_client_id.get_secret_value(), cfg.naver_client_secret.get_secret_value()
        eng = engine()
        now = parse_as_of(args.as_of)
        # 오늘(KST)은 아직 하루가 끝나지 않았다 — 어제까지만 받는다
        end = now.astimezone(dl.KST).date() - timedelta(days=1)
        only = set(symbols_arg(args.symbols) or [])
        stored_all = points_by_series(eng, dl.SOURCE)
        failed: list[str] = []
        unlinked: list[str] = []
        requests = 0
        total = 0
        with httpx.Client(headers={"User-Agent": "salt-forecast/0.1"}) as client:
            names = UpbitDaily(client, cfg.upbit_base_url, UpbitPacer(cfg.upbit_requests_per_second)).krw_market_names()
            pacer = Pacer(1.0)
            for market, ko, _en in names:
                keyword = search_keyword(ko)
                if keyword is None or (only and market not in only):
                    continue
                if requests >= args.max_requests:
                    break
                sid = dl.series_id(market)
                stored = {o.astimezone(dl.KST).date(): v for o, v in stored_all.get(sid, {}).items()}
                if stored and max(stored) >= end:
                    continue
                start = end - timedelta(days=OVERLAP_DAYS) if stored else dl.FIRST_DAY
                try:
                    requests += 1
                    fresh = fill_days(
                        dl.search_daily(client, cfg.naver_datalab_url, cid, secret, pacer, keyword, start, end),
                        start,
                        end,
                    )
                except SourceError as e:
                    failed.append(market)
                    log.warning("요청 실패", extra={"fields": {"job": JOB, "symbol": market, "error": str(e)}})
                    if not e.retryable and ("401" in str(e) or "403" in str(e)):
                        break  # 키 · 권한 문제 — 나머지 종목도 같다
                    continue
                new = chain_link(stored, fresh) if stored else fresh
                if new is None:
                    unlinked.append(market)
                    continue
                pts = [
                    SeriesPoint(dl.SOURCE, sid, dl.observed_at(d), dl.observed_at(d) + dl.AVAILABLE_LAG, v, dl.UNIT)
                    for d, v in sorted(new.items())
                ]
                total += len(pts) if args.dry_run else upsert_points(eng, pts)
        if not args.dry_run:
            mark_source(eng, dl.SOURCE, ok=not failed, error=", ".join(failed[:10]) if failed else None)
        log.info(
            "수집",
            extra={
                "fields": {"job": JOB, "requests": requests, "points": total, "failed": failed, "unlinked": unlinked}
            },
        )
        return total

    return run_job(JOB, args, body)


if __name__ == "__main__":
    raise SystemExit(main())
