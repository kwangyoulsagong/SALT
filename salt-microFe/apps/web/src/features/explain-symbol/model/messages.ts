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
  /** 서버 게이트가 닫혔다(`renderable: false`) — 화면의 판단이 그사이 바뀌었다 */
  blocked: "판단이 방금 바뀌어 해설할 근거가 부족합니다. 새로고침하면 최신 판단을 볼 수 있습니다.",
  signedOut: "로그인하면 해설을 볼 수 있습니다.",

  /** 스트림 단계(FEATURE-008 FR-61) — 서버가 실제로 그 일을 할 때 켜진다 */
  steps: {
    judgment: "판단 근거 확인",
    draft: "근거로 문장 쓰기",
    polish: "AI 로 다듬기",
    verify: "숫자 · 말투 검사",
  },
  stepsLabel: "해설 진행 단계",
  stepSkipped: "건너뜀",
  /** 스크린리더용 단계 상태 — 아이콘만으로 말하지 않는다 */
  stepState: { pending: "대기", active: "진행 중", done: "완료", skipped: "건너뜀" },
  /** 검증을 통과한 AI 문장으로 바뀐 순간 한 번 보인다 */
  replacedNote: "검사를 통과한 AI 문장으로 바꿨어요.",
  droppedNote: (count: number) => `검사에 걸린 문장 ${count}개는 근거 문장으로 대신했어요.`,
  /** 템플릿이 최종 — AI 가 실패했거나 꺼져 있다 */
  templateNote: "근거 데이터로 만든 문장이에요. AI 다듬기는 이번에 쓰지 못했어요.",
  citationsLabel: "출처",

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
