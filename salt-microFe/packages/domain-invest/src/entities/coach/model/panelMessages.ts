/**
 * 한 장 패널 문구(F017 v4 순서 1e · `FE-REQ-064` FR-8~11 · 시안 `pm/docs/2026-11-13-one-panel-research.html` §6).
 *
 * 금지(공통 수용 기준 4): 확신 표현 · "오릅니다/내립니다" 단정 · "파세요/사세요" · 목표가 · 원인 단정어(`i18n-policy.md`).
 * 숫자는 전부 서버 · BFF 값이다 — 여기 함수는 그 값을 문장 틀에 넣기만 한다.
 */
export const PANEL_MESSAGES = {
  heading: "다음 시나리오",
  ai: "✦ AI",
  aiSr: "AI 가 만든 칸이 섞여 있어요",
  unavailable: "패널을 지금 불러오지 못했어요 — 잠시 뒤 다시 열어 주세요",
  rows: {
    usual: "이런 상황 뒤 보통은",
    cause: "왜 움직였나",
    company: "회사 사정",
    invalidation: "이 판단이 틀리는 때",
    track: "이 판단의 성적",
  },
  // ② 왜 움직였나 — 문장은 서버 것, 칸이 비면 이 한 줄
  causeDefect: "원인 칸을 지금 불러오지 못했어요",
  // ③ 회사 사정 — 문구 · 숫자는 서버가 원문에서 뽑은 사실(F017 v4 2d)
  companyNone: "확인된 공시 · 기사 사실이 아직 없어요",
  companyNoneNote: "약관이 허락한 매체 기사와 공시에서 뽑은 사실만 보여요",
  companyDefect: "회사 사정을 지금 불러오지 못했어요",
  companyGroups: { earnings: "실적", today: "오늘", recent: "최근", sector: "업계", concern: "걸리는 점" },
  companyWindow: (days: 90 | 365) => `최근 7일 안 사실이 없어 최근 ${days}일 사실이에요`,
  companyCount: (n: number) => `사실 ${n}개 중 일부`,
  companySourceSr: (name: string) => `${name} 원문(새 창)`,
  // ④ 틀리는 때
  invalidationLine: (price: string, pct: string) => `${price} 아래 (${pct})`,
  invalidationNote: "과거 비슷한 날의 나쁜 쪽 10% 선이에요. 이 아래로 끝나면 틀린 것으로 채점해요.",
  invalidationNone: "틀리는 선을 말할 기록이 아직 적어요",
  gaugeLine: "틀리는 선",
  gaugeNow: "지금",
  // ⑤ 성적
  trackLine: (hits: number, base: number | null) =>
    base === null ? `100번 중 ${hits}번 맞음` : `100번 중 ${hits}번 맞음 · 늘 같은 쪽 ${base}번`,
  trackSample: (sample: string, origin: "live" | "backtest") => (origin === "live" ? `실제 판단 ${sample}번` : `과거 시세로 되돌려 본 ${sample}번`),
  trackThis: "이 판단",
  trackBaseline: "늘 같은 쪽",
  trackNoBaseline: "관망은 견줄 '늘 같은 쪽'이 없어요",
  trackDefect: (sample: string) => `이 판단은 아직 ${sample}번뿐이라 성적을 말하기엔 적어요`,
  trackMiss: (date: string, name: string, pct: string) => `틀렸던 때: ${date} ${name}, 같은 판단 뒤 ${pct}`,
  trackNoMiss: "기록된 틀린 때가 아직 없어요",
  trackDonutSr: (hits: number) => `100번 중 ${hits}번 맞음`,
  // AI 해설 상자
  explainHead: "AI 해설",
  explainHeadPlain: "해설",
  explainSub: "위 사실만으로 쓴 문장",
  explainSubTemplate: "모은 사실을 그대로 옮긴 문장",
  // 이전 AI 단 = 그 뒤 재료(숫자 · 소식 · 꼬리표)가 바뀌었지만 판단 방향은 같다 — "판단이 바뀌었다"고 말하지 않는다
  explainPrevious: (when: string) => `${when}에 쓴 해설이에요 — 그 뒤 들어온 숫자 · 소식은 아직 반영 전이에요`,
  explainDefect: "해설을 지금 불러오지 못했어요",
  explainWriting: "AI 가 위 사실로 해설을 쓰고 있어요",
  // 내 기준
  mineHead: "내 기준",
  mineOnlyYou: "나만 보여요",
  mineLine: {
    stop: (price: string, gap: string) => `내가 정한 손절선(${price})까지 ${gap}`,
    target: (price: string, gap: string) => `내가 정한 목표선(${price})까지 ${gap}`,
  },
  mineNoLine: "정한 선이 없어요 — 거래를 적을 때 손절선을 함께 적을 수 있어요",
  mineAvg: (avg: string, pct: string) => `내 평단 ${avg} 대비 ${pct}`,
  mineUnavailable: "내 보유를 지금 불러오지 못했어요",
  // 칸 결함 공통
  cellUnavailable: "이 칸을 지금 불러오지 못했어요",
  fanSr: (low: string, mid: string, high: string) => `지난 가격과, 과거 비슷한 때 10번 중 8번이 움직인 범위 ${low} ~ ${high}(가운데 ${mid})`,
  fanUsual: (mid: string) => `보통 ${mid}`,
  fanBadLine: "나빴을 때 선",
} as const;
