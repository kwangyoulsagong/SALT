/**
 * 점검 문구(F017 v2 단계 2 · `FE-REQ-064` FR-3). **맨 위 한 줄은 서버 문장**이라 여기 없다 — 여기는 칸 이름 · 펼침 · 상태뿐.
 * 확신 표현 · 명령형 · 목표가 0(`i18n-policy.md` · 마스터 인덱스 §6-4).
 */

const pct = (rate: number) => `${rate >= 0 ? "+" : ""}${rate.toFixed(1)}%`;

export const TRADE_CHECK_MESSAGES = {
  heading: "점검",
  sideGroupLabel: "언제를 점검할까요",
  sides: { buy: "사기 전", sell: "팔기 전" },
  unavailable: "점검을 불러오지 못했어요. 판단과 차트는 그대로 볼 수 있어요.",
  dotsLabel: (dots: number) => `100칸 중 ${dots}칸`,
  sampleLine: (sample: number, days: number) => `비슷한 상황 ${sample.toLocaleString("ko-KR")}번 · 서로 다른 날 ${days.toLocaleString("ko-KR")}일`,
  staleReference: "기준 종가가 오래돼 조건을 판정하지 않았어요",
  notCovered: "이 종목은 아직 과거 기록을 세지 않았어요",
  recentDiffers: "최근 1년은 이 범위 밖이었어요 — 국면이 바뀌었을 수 있어요",
  describeOnly: "이 조건은 효과가 검증된 신호가 아니라 지난 기록을 그대로 보여 드려요",
  alsoMatched: (phrases: string[]) => `같이 해당하는 상황: ${phrases.join(" · ")}`,
  more: "기간별 분포 보기",
  horizonBuy: (label: string, rangeText: string) => `${label} — ${rangeText}`,
  horizonHold: (label: string, rangeText: string) => `더 들고 있었을 때 ${label} — ${rangeText}`,
  horizonBelowMin: (label: string) => `${label} — 비슷한 상황이 아직 적어요`,
  realized: (rate: number) => `지금 팔면 확정되는 수익률 ${pct(rate)}`,
  noHolding: "보유가 없어 확정 수익률은 없어요 — 아래는 같은 상황에서 더 들고 있었을 때의 지난 기록이에요",
  costNote: {
    kr: "사기 전 숫자는 수수료 · 세금을 뺀 뒤예요. 팔기 전 숫자는 파는 비용이 같아 빼지 않았어요",
    crypto: "사기 전 숫자는 수수료를 뺀 뒤예요. 팔기 전 숫자는 파는 비용이 같아 빼지 않았어요",
  },
} as const;
