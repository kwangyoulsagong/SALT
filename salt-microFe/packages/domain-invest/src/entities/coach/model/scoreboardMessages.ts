/**
 * 판정 성적표 문구 (F010 슬라이스 3 · `FE-REQ-040` FR-6 · `i18n-policy.md`).
 *
 * 성적 4요소 — **기간 · 표본 · 기준 대비 · 빗나간 사례**를 한 줄씩 늘 같이 쓴다(리서치 §9-3). 표본이 부족하면 적중률 숫자를
 * 감추되 **감춘 이유를 보인다** — 그것이 신뢰다. 좋다 · 나쁘다 · 믿어도 된다 같은 평가 문장은 없다.
 */
export const SCOREBOARD_MESSAGES = {
  heading: "판정 성적표",
  description: "관찰 기간이 끝난 종목 판단만 채점해요. 모든 사용자에게 같은 표예요",
  /** 서버 `signalType` → 이름. 매핑 없는 코드는 줄을 그리지 않는다 */
  signalTypes: {
    "scalp.review_short_opportunity": "단타 · 기회 후보",
    "scalp.wait": "단타 · 관망",
    "scalp.avoid": "단타 · 지금은 피하기",
    "long_term.review_accumulation": "장기 · 모아가기 후보",
    "long_term.wait": "장기 · 관망",
    "long_term.avoid": "장기 · 지금은 피하기",
  } as Record<string, string | undefined>,
  /** 자산군 머리(F011 FR-65) — 두 자산군이 같이 올 때만 그린다. 표본을 섞지 않고 나란히 둔다 */
  assetClasses: { crypto: "코인", kr_stock: "국내 주식" },
  sample: (count: number) => `채점 ${count.toLocaleString("ko-KR")}회`,
  /** 국내 그룹이 과거 시세로 되돌려 채점한 모의 성적일 때(F011 슬라이스 7b) — 숫자 옆에 늘 */
  backtestBadge: "모의",
  backtestNote: "과거 시세로 되돌려 채점 — 실제 판단 기록이 20건 쌓이면 그 기록으로 바뀌어요",
  /** 서버가 표본 부족이라고 한 그룹 — 적중률을 그리지 않는 이유 */
  lowSample: "아직 채점 표본이 적어 적중률을 보이지 않아요",
  winRate: (rate: string) => `적중 ${rate}`,
  excess: (points: string) => `늘 같은 행동 대비 ${points}`,
  avgReturn: (rate: string) => `평균 ${rate}`,
  horizon: (hours: number) => (hours % 24 === 0 ? `판단 뒤 ${hours / 24}일 기준` : `판단 뒤 ${hours}시간 기준`),
  missesHeading: "최근 빗나간 판정",
  missLine: (label: string, rate: string) => `${label} → 관찰 기간 ${rate}`,
  noMisses: "아직 빗나간 판정 기록이 없어요",
  empty: "관찰 기간이 끝난 판단이 아직 없어요. 단타는 하루, 장기는 30일 뒤부터 채점돼요",
  unavailable: "지금은 판정 성적표를 불러올 수 없어요",
  signedOut: "로그인하면 판정 성적표를 볼 수 있어요",
  generatedAt: (at: string) => `${at} 기준`,
} as const;

/**
 * 판정 근거 상세(`/coach/signals/[signalType]`, F004 FR-33 · 34 · `FE-REQ-026` FR-141 · 142).
 * 분포는 **지난 표본의 모양**이다 — "이 구간에 들 확률" · 기대 수익 문구를 두지 않는다.
 */
export const SIGNAL_EVIDENCE_MESSAGES = {
  back: "코치 리포트",
  /** 성적표 그룹에서 이 화면으로 — 이름 뒤에 셰브론 */
  openLink: "분포 · 맞았던 때 · 틀렸던 때",
  openLinkLabel: (label: string) => `${label} 판정 근거 자세히 보기`,
  headingSuffix: "판정 근거",
  description: "이 판단이 나온 뒤 관찰 기간 동안 실제로 어떻게 움직였는지예요. 모든 사용자에게 같은 기록이에요",
  metrics: {
    sample: "채점",
    winRate: "적중률",
    avgReturn: "평균",
    worst: "가장 나빴던 한 번",
  },
  sampleValue: (count: number) => `${count.toLocaleString("ko-KR")}회`,
  /** 표본 부족 — 비율 칸은 숫자 대신 이 말 */
  lowSampleValue: "표본 적음",
  lowSampleNote: "아직 채점 표본이 적어 비율 숫자를 보이지 않아요. 아래 분포와 사례는 지금까지 채점된 그대로예요",
  worstNote: "최대 낙폭이 아니라 표본 중 가장 낮았던 한 번의 수익률이에요",
  distributionHeading: (horizon: string | null) => (horizon ? `${horizon} 수익률 분포` : "수익률 분포"),
  horizonDays: (days: number) => (days === 1 ? "판단 뒤 하루" : `판단 뒤 ${days}일`),
  distributionNote: "지난 판단이 어느 구간에서 끝났는지 센 것이에요. 다음 판단이 어느 구간에 들지 알려 주지 않아요",
  bucketLabels: {
    lte_m20: "−20% 이하",
    m20_m10: "−20 ~ −10%",
    m10_0: "−10 ~ 0%",
    "0_p10": "0 ~ +10%",
    p10_p20: "+10 ~ +20%",
    gte_p20: "+20% 초과",
  },
  bucketCount: (count: number) => `${count.toLocaleString("ko-KR")}회`,
  quartiles: (p25: string, median: string, p75: string) => `가운데 절반 ${p25} ~ ${p75} · 중앙값 ${median}`,
  tableCaption: (horizon: string) => `${horizon} 수익률 구간별 채점 횟수`,
  colBucket: "구간",
  colCount: "횟수",
  noDistribution: "수익률 분포를 아직 받지 못했어요",
  hitsHeading: "맞았던 때",
  missesHeading: "틀렸던 때",
  casesNote: "가장 최근 것부터 같은 개수까지만 보여요. 좋은 사례만 골라 올리지 않아요. 숫자는 관찰 기간이 끝났을 때의 수익률이에요",
  noHits: "아직 맞았던 기록이 없어요",
  noMisses: "아직 틀렸던 기록이 없어요",
  notFound: "이 판단 유형의 채점 기록이 없어요",
  signedOut: "로그인하면 판정 근거를 볼 수 있어요",
  unavailable: "지금은 판정 근거를 불러올 수 없어요",
  assetClassMeta: { crypto: "코인", kr_stock: "국내 주식" },
} as const;
