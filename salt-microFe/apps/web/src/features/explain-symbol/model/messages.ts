/** 해설 기능 문구 (`i18n-policy.md`) */
export const EXPLAIN_MESSAGES = {
  heading: "AI 해설",
  open: "해설 보기",
  aiBadge: "AI 생성",
  generatedAt: (time: string) => `${time} 생성`,
  modeReasoningHeading: "이 관점인 이유",
  keyDriversHeading: "핵심 근거",
  risksHeading: "주의점",
  newsHeading: "관련 뉴스 요약",
  trackRecordHeading: "이 판단의 과거 성적",
  /** 429 — BFF 동시 상한(`explain_busy`) · 서버 분당 제한. 오류가 아니다 */
  busy: "지금 해설 요청이 많습니다. 잠시 후 다시 눌러 주세요.",
  /** FR-62 — 실패 · 타임아웃이면 규칙 기반 문장을 대신 보여 준다 */
  ruleBasedBadge: "규칙 기반 설명",
  ruleBasedNote: "AI 해설을 지금 만들 수 없어 판단의 근거 문장을 대신 보여 드립니다.",
  subjectMissing: "시세 정보를 찾지 못해 해설을 요청할 수 없습니다.",
  signedOut: "로그인하면 해설을 볼 수 있습니다.",

  /** 모델에 넘기는 근거 라벨. 화면 문구가 아니라 요청 본문이지만 한 곳에 둔다 */
  evidence: {
    judgment: "판단",
    reason: "근거",
    risk: "주의",
    rsi: "RSI",
    sentiment: "시장 심리",
    whaleBuy: "고래 매수 대금(원)",
    whaleSell: "고래 매도 대금(원)",
  },
} as const;
