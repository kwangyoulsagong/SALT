/**
 * 해설 재료 "최근 흐름" — 오늘 등락을 하루만 떼어 읽히지 않게 하는 닫힌 일봉 사실 한 줄(`SRV-REQ-063` FR-2).
 *
 * ## 왜
 *
 * 2026-11-26 삼성전자는 직전 거래일 -9.87% 뒤 +2.2% 였다. 해설 재료의 등락은 전일 대비 하나(`change24h`)뿐이라
 * 해설이 "업종 9종목 중 8종목이 같이 올라 +2.28%" 만 말했고, 판정은 관망인데 반등 이야기처럼 읽혔다(사용자 지적).
 * 맥락을 문장에 넣을 숫자가 재료에 없으면 검증기(`allowedFacts`)가 그 숫자를 막는다 — 그래서 사실로 싣는다.
 *
 * 새 판단이 아니다 — 판정 · 점수에 들어가지 않고 문장 재료로만 간다. 숫자는 닫힌 일봉 종가와 지금 가격에서 그대로 나눈다.
 */

/** 맨 끝 닫힌 봉이 이보다 오래면 싣지 않는다 — 수집이 멈춘 종목에 낡은 흐름을 붙이지 않는다(연휴 · 주말은 안쪽) */
export const RECENT_FLOW_MAX_STALE_DAYS = 7;
/** 몇 거래일 전 종가와 비교하나 */
export const RECENT_FLOW_WEEK_BARS = 5;
/** 최고 종가를 찾는 창 */
export const RECENT_FLOW_HIGH_BARS = 20;
/** 최고 종가보다 이만큼(%) 이상 아래일 때만 그 칸을 싣는다 — 고점 근처면 말할 거리가 아니다 */
export const RECENT_FLOW_DRAWDOWN_MIN = 1;

export interface RecentFlowInput {
  /** 닫힌 일봉 종가 — 오래된 것 → 최근, 진행 중인 오늘 봉은 빼고 */
  closes: readonly { openTime: Date; close: number }[];
  currentPrice: number;
  now: Date;
}

export interface RecentFlow {
  /** 맨 끝 닫힌 봉의 전 봉 대비 % */
  previousSession: number;
  /** 지금 가격의 5거래일 전 종가 대비 % — 봉이 모자라면 `null` */
  week: number | null;
  /** 지금 가격의 최근 20거래일 최고 종가 대비 %(음수) — 고점 근처면 `null` */
  fromHigh: number | null;
}

const pct = (to: number, from: number) => Math.round((to / from - 1) * 10000) / 100;

/** KST 달력 날짜 — 오늘 봉을 가른다(국내 봉은 그날 00:00 UTC, 코인 봉은 09:00 KST 로 온다 — 둘 다 같은 날로 떨어진다) */
const kstDay = (at: Date) => new Date(at.getTime() + 9 * 3_600_000).toISOString().slice(0, 10);

export const recentFlow = ({ closes, currentPrice, now }: RecentFlowInput): RecentFlow | null => {
  // 오늘 봉은 뺀다 — 장 마감 뒤 오늘 봉이 닫히면 "직전 거래일"이 오늘 등락(`change24h`)과 같은 숫자가 된다
  const today = kstDay(now);
  const bars = closes.filter((b) => Number.isFinite(b.close) && b.close > 0 && kstDay(b.openTime) < today);
  if (bars.length < 2 || !(currentPrice > 0)) return null;
  const last = bars[bars.length - 1]!;
  if (now.getTime() - last.openTime.getTime() > RECENT_FLOW_MAX_STALE_DAYS * 86_400_000) return null;

  const previousSession = pct(last.close, bars[bars.length - 2]!.close);
  const weekBase = bars.length >= RECENT_FLOW_WEEK_BARS ? bars[bars.length - RECENT_FLOW_WEEK_BARS]!.close : null;
  const high = Math.max(...bars.slice(-RECENT_FLOW_HIGH_BARS).map((b) => b.close));
  const drawdown = pct(currentPrice, high);
  return {
    previousSession,
    week: weekBase === null ? null : pct(currentPrice, weekBase),
    fromHigh: drawdown <= -RECENT_FLOW_DRAWDOWN_MIN ? drawdown : null,
  };
};

const signed = (v: number) => `${v > 0 ? "+" : v < 0 ? "-" : ""}${Math.abs(v).toFixed(2)}%`;

/**
 * 근거 한 줄 값 — 부호를 숫자에 붙인다(검증기가 방향까지 대조한다: "9.87% 내린 뒤"는 맞고 "9.87% 오른 뒤"는 걸린다).
 * 라벨은 `EXPLANATION_EVIDENCE_LABEL.recentFlow`
 */
export const recentFlowText = (flow: RecentFlow): string =>
  [
    `직전 거래일 ${signed(flow.previousSession)}`,
    ...(flow.week !== null ? [`${RECENT_FLOW_WEEK_BARS}거래일 전 종가 대비 ${signed(flow.week)}`] : []),
    ...(flow.fromHigh !== null ? [`최근 ${RECENT_FLOW_HIGH_BARS}거래일 최고 종가 대비 ${signed(flow.fromHigh)}`] : []),
  ].join(" · ");
