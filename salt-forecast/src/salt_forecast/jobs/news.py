"""뉴스 수집 · 감성 점수(F010 슬라이스 6 3차 · FC-REQ-016 · 사전등록 news-sentiment@1).

매시 돈다(`ops/daily.sh` 가 20시간 게이트 앞에서 부른다). RSS 는 피드마다 최근 30건만 주므로 하루 한 번이면 빈다.
피드 하나가 실패해도 나머지는 받는다 — 실패는 `source_status` 에 남는다.

점수는 `nlp` 의존성 그룹이 필요하다(`uv run --group nlp`). 없으면 수집만 하고 점수는 다음 실행이 매긴다 —
점수 행은 `scored_at` 을 따로 갖고, 채점은 기사의 `fetched_at` 으로 자르므로 늦게 매겨도 시점이 바뀌지 않는다.
모델이 같으면 같은 제목에 같은 점수다(재현).
"""

from __future__ import annotations

from datetime import UTC, datetime

import httpx

from salt_forecast.config import settings
from salt_forecast.domain.news_text import build_aliases
from salt_forecast.ingest import naver_news, rss
from salt_forecast.ingest.http import Pacer, SourceError
from salt_forecast.ingest.upbit import Pacer as UpbitPacer
from salt_forecast.ingest.upbit import UpbitDaily
from salt_forecast.jobs._common import base_parser, logger, run_job
from salt_forecast.store.db import engine
from salt_forecast.store.news import NewsRow, insert_items, insert_scores, last_fetch_success, unscored
from salt_forecast.store.runs import mark_source

JOB = "news"
SOURCE = "news_rss"
# 한 번에 매기는 최대 기사 수 — CPU 로 32건 묶음이 1~2초. 밀린 것은 다음 실행이 잇는다
SCORE_LIMIT = 2000
# 매시 작업 — 수집 수 분 · 점수(모델 로드 포함) 수 분. 20분을 넘으면 매달린 것으로 보고 끊는다(2026-11-10 8시간 멈춤)
MAX_SECONDS = 20 * 60


def main(argv: list[str] | None = None) -> int:
    p = base_parser("뉴스 RSS 수집 · 금융 감성 점수")
    p.add_argument("--no-score", action="store_true", help="수집만 한다")
    p.add_argument("--no-fetch", action="store_true", help="이미 받은 기사에 점수만 매긴다")
    args = p.parse_args(argv)
    log = logger(JOB)

    def body() -> int:
        cfg = settings()
        eng = engine()
        # 시각은 실제로 받은 때다 — `--as-of` 로 과거를 적지 않는다(지금 상태만 주는 원천, coingecko 와 같다)
        fetched_at = datetime.now(UTC)
        total = 0
        with httpx.Client(headers={"User-Agent": "salt-forecast/0.1"}) as client:
            if not args.no_fetch:
                items: list[rss.NewsItem] = []
                failed: list[str] = []
                pacer = Pacer(1.0)
                # 잠든 동안 빈 날을 날짜 검색으로 다시 받는다 — 받은 시각(available)은 지금이라
                # 피처 시점은 늦게 안 것으로 남는다(누수 없음)
                last_ok = last_fetch_success(eng, SOURCE)
                gap = rss.gap_days(last_ok, fetched_at)
                if gap:
                    log.info("빈 기간 메우기", extra={"fields": {"job": JOB, "days": [d.isoformat() for d in gap]}})
                # 등록 원천(매시 RSS 13개)이 먼저 — 한 묶음 안 같은 URL 은 먼저 나온 행이 남는다(insert_items)
                plan = [(s, u, rss.PER_FEED) for s, u in rss.feeds()] + [
                    (s, u, rss.GAP_PER_FEED) for s, u in rss.gap_feeds(gap)
                ]
                for source, url, limit in plan:
                    try:
                        items.extend(rss.fetch_feed(client, source, url, pacer, fetched_at, limit))
                    except SourceError as e:
                        failed.append(source)
                        log.warning("피드 실패", extra={"fields": {"job": JOB, "source": source, "error": str(e)}})
                # 네이버 뉴스 검색(보조) — 평소 첫 쪽, 잠든 뒤엔 마지막 성공 전 기사까지
                if cfg.naver_client_id is not None and cfg.naver_client_secret is not None:
                    hub = Pacer(5.0)  # HUB 키당 50 RPS · 월 5만 회 — 매시 10요청 + 깨어날 때 최대 110
                    for q in rss.GOOGLE_KO_QUERIES:
                        try:
                            items.extend(
                                naver_news.search(
                                    client,
                                    naver_news.URL,
                                    cfg.naver_client_id.get_secret_value(),
                                    cfg.naver_client_secret.get_secret_value(),
                                    hub,
                                    q,
                                    fetched_at,
                                    last_ok if gap else None,
                                )
                            )
                        except SourceError as e:
                            failed.append(f"naver:{q}")
                            log.warning("네이버 실패", extra={"fields": {"job": JOB, "query": q, "error": str(e)}})
                rows = [NewsRow(**{f: getattr(i, f) for f in NewsRow.__dataclass_fields__}) for i in items]
                written = len(rows) if args.dry_run else insert_items(eng, rows)
                total += written
                log.info("수집", extra={"fields": {"job": JOB, "items": len(items), "new": written, "failed": failed}})
                if not args.dry_run:
                    feeds = len(rss.feeds())
                    rss_failed = [f for f in failed if f.startswith("rss:")]  # 네이버는 보조 — 성공 판정에 안 넣는다
                    mark_source(
                        eng, SOURCE, ok=len(rss_failed) < feeds, error=", ".join(failed[:10]) if failed else None
                    )

            if args.no_score:
                return total
            try:
                from salt_forecast.models.news_sentiment import SPECS, SentimentModel, score_items
            except ImportError:
                log.warning("nlp 그룹 없음 — 점수 건너뜀", extra={"fields": {"job": JOB}})
                return total
            todo = unscored(eng, {lang: spec.version for lang, spec in SPECS.items()}, SCORE_LIMIT)
            if not todo:
                return total
            upbit = UpbitDaily(client, cfg.upbit_base_url, UpbitPacer(cfg.upbit_requests_per_second))
            aliases = build_aliases(upbit.krw_market_names())
            models = {
                lang: SentimentModel.load(spec) for lang, spec in SPECS.items() if any(t.lang == lang for t in todo)
            }
            scores = score_items(todo, aliases, models, datetime.now(UTC))
            written = len(scores) if args.dry_run else insert_scores(eng, scores)
            linked = sum(1 for s in scores if s.symbols)
            log.info(
                "점수",
                extra={"fields": {"job": JOB, "scored": written, "linked": linked, "aliases": len(aliases)}},
            )
            return total + written

    return run_job(JOB, args, body, max_seconds=MAX_SECONDS)


if __name__ == "__main__":
    raise SystemExit(main())
