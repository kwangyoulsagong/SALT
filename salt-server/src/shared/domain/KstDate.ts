/**
 * KST 기준 날짜.
 *
 * ## 왜 타입이 필요한가
 *
 * **세금 기준일이 tz 경계를 갖는다.** 12/30과 12/31의 차이가 250만원 공제 한 해분이다
 * (`ddd-shared.md`). `new Date()` 를 그대로 쓰면 서버 tz 에 따라 하루가 밀린다.
 *
 * 내부는 `YYYY-MM-DD` 문자열이다 — 자정 경계에서 `Date` 산술이 흔들리지 않는다.
 */
export class KstDate {
  private static readonly OFFSET_MINUTES = 9 * 60;

  private constructor(readonly isoDate: string) {}

  /** `YYYY-MM-DD`. */
  static parse(isoDate: string): KstDate {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
      throw new Error(`KST 날짜 형식이 아니다: ${isoDate}`);
    }
    return new KstDate(isoDate);
  }

  /** UTC 시각을 KST 달력 날짜로 옮긴다. */
  static fromInstant(instant: Date): KstDate {
    const shifted = new Date(
      instant.getTime() + KstDate.OFFSET_MINUTES * 60 * 1000
    );
    return new KstDate(shifted.toISOString().slice(0, 10));
  }

  static today(now: Date = new Date()): KstDate {
    return KstDate.fromInstant(now);
  }

  /** KST 자정의 UTC 시각. DB 범위 조회에 쓴다. */
  startOfDayUtc(): Date {
    return new Date(`${this.isoDate}T00:00:00+09:00`);
  }

  endOfDayUtc(): Date {
    return new Date(`${this.isoDate}T23:59:59.999+09:00`);
  }

  /** 남은 일수. 음수면 이미 지났다. */
  daysUntil(other: KstDate): number {
    const millis =
      other.startOfDayUtc().getTime() - this.startOfDayUtc().getTime();
    return Math.round(millis / (24 * 60 * 60 * 1000));
  }

  equals(other: KstDate): boolean {
    return this.isoDate === other.isoDate;
  }

  toString(): string {
    return this.isoDate;
  }
}
