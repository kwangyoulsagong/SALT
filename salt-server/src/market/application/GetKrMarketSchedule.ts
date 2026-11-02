import { toKrSchedule, type KrScheduleView, type MarketScheduleReader } from "../domain";

/**
 * 다가오는 국내 시장 일정(날짜 · 종류 · 남은 날) — F008 슬라이스 24 `SRV-REQ-041` FR-5.
 *
 * 분포가 없어 소유자 검사가 없다(로그인만). 뷰 한 번 읽기(FR-6).
 */
export class GetKrMarketSchedule {
  constructor(private readonly reader: MarketScheduleReader) {}

  async execute(days: number, now: Date = new Date()): Promise<KrScheduleView> {
    return toKrSchedule(await this.reader.upcoming(), now, days);
  }
}
