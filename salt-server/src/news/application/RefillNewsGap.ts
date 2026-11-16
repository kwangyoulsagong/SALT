import { logger } from "../../shared/config/logger";
import type { ArticleRepository, NewsGapFeedPort, NewsGapLedger } from "../domain";
import { newsGapDays } from "../domain";
import { saveAll } from "./CrawlNews";

export interface RefillNewsGapResult {
  days: string[];
  savedCount: number;
  skippedCount: number;
  /** 실패한 (검색어, 하루) 수 — 0 이 아니면 마지막 성공을 옮기지 않아 다음 회차가 같은 구간을 다시 찾는다 */
  failed: number;
}

/**
 * 잠든 동안 빈 날을 날짜 검색으로 메운다(`SRV-REQ-057` FR-8). 규칙(어느 날을 다시 찾나)은 `domain/NewsGap.ts` `newsGapDays`.
 *
 * ## 마지막 성공은 어디서 오나
 *
 * 프로세스가 뜰 때 한 번 원장(`NewsGapLedger` — 한글 검색 기사 `max(created_at)`)에서 읽고, 그 뒤는 메모리가 갖는다.
 * 원장 값만 쓰면 **깬 첫 정기 회차가 넣은 기사가 신호를 지금으로 덮어** 메우기가 중간에 끊겼을 때 구간을 잃는다 — 그래서
 * - 회차 시작에 `due` (정기 수집 **전**) → 메울 날이 있으면 정기 수집 뒤 `fill`
 * - 메울 날이 없고 정기 회차가 한글 기사를 받았을 때만 `markLive` 로 옮긴다
 * - `fill` 은 실패가 0 일 때만 회차 시작 시각으로 옮긴다
 *
 * 메우는 동안 다른 회차의 `due` 는 빈 배열(겹쳐 돌지 않는다). 저장은 정기 수집과 같은 `saveAll`(주소로 한 번 · 받은 시각 = 지금).
 */
export class RefillNewsGap {
  private lastOk: Date | null | undefined = undefined;
  private filling = false;

  constructor(
    private readonly articles: ArticleRepository,
    private readonly ledger: NewsGapLedger,
    private readonly feed: NewsGapFeedPort
  ) {}

  /** 메울 날 — 정기 수집 전에 부른다. 메우는 중이면 빈 배열 */
  async due(now: Date): Promise<string[]> {
    if (this.filling) return [];
    if (this.lastOk === undefined) this.lastOk = await this.ledger.lastKoreanFetchedAt();
    return newsGapDays(this.lastOk, now);
  }

  /** 정기 회차가 한글 기사를 받았고 메울 날이 없었을 때 — 마지막 성공을 회차 시작으로 */
  markLive(startedAt: Date): void {
    if (this.filling) return;
    if (!this.lastOk || this.lastOk < startedAt) this.lastOk = startedAt;
  }

  /** 하루씩 다시 검색해 저장. 이미 메우는 중이면 `null` */
  async fill(days: string[], startedAt: Date): Promise<RefillNewsGapResult | null> {
    if (this.filling || days.length === 0) return null;
    this.filling = true;
    const result: RefillNewsGapResult = { days, savedCount: 0, skippedCount: 0, failed: 0 };
    try {
      logger.info(`[news] 빈 날 메우기 시작 ${days[0]}~${days[days.length - 1]}(${days.length}일)`);
      for (const day of days) {
        const { items, failed } = await this.feed.fetchKoreanDay(day);
        const saved = await saveAll(this.articles, items);
        result.savedCount += saved.savedCount;
        result.skippedCount += saved.skippedCount;
        result.failed += failed;
        logger.info(`[news] 빈 날 ${day} — 받음 ${items.length} · 새로 ${saved.savedCount} · 실패 검색어 ${failed}`);
      }
      if (result.failed === 0 && (!this.lastOk || this.lastOk < startedAt)) this.lastOk = startedAt;
      return result;
    } finally {
      this.filling = false;
    }
  }
}
