import type { ExplainProvider } from "@repo/core/coach";

/** 쓴 공급자 이름 — 컴포넌트에 문자열을 두지 않는다. Gemini 는 이름 없이 "AI" */
const PROVIDER_NAME: Record<ExplainProvider, string> = {
  local_claude: "Claude",
  local_codex: "Codex",
  gemini: "AI",
};

/** 해설 기능 문구 (`i18n-policy.md`) — F017 v2 단계 3 · `FE-REQ-064` FR-2 */
export const EXPLAIN_MESSAGES = {
  heading: "AI 해설",
  aiBadge: "AI 생성",
  /** 최신 AI — 정리한 시각 */
  latestAt: (time: string, provider: ExplainProvider | null) =>
    `${time} ${provider ? PROVIDER_NAME[provider] : "AI"}가 정리했어요`,
  /** 이전 AI — 판단은 같은 방향이지만 그 뒤 근거가 조금 바뀌었다. 새 해설은 서버가 만든다 */
  previousAt: (time: string) => `${time}에 정리한 해설이에요 — 판단 방향은 지금과 같아요`,
  /** 사실표 문장 — AI 표시 없음 */
  templateNote: "근거 데이터로 만든 문장이에요",
  /** 마지막 단 — 사실표를 못 만들었다(현재가 없음). 규칙 판단의 근거를 그대로 */
  noneHeading: "특이 소식이 없어요",
  noneNote: "규칙 판단의 근거를 그대로 보여 드려요",
  modeReasoningHeading: "이 관점인 이유",
  keyDriversHeading: "핵심 근거",
  risksHeading: "주의점",
  newsHeading: "관련 소식",
  /** 서버가 판단 블록과 같은 값으로 쓴 칸(F017 v4 순서 1c) — 어느 단이든 늘 */
  trackHeading: "얼마나 믿을까",
  missHeading: "틀렸던 때",
  unavailable: "해설을 지금 불러오지 못했어요. 판단 카드의 근거를 먼저 봐 주세요.",
  /** 문장 끝 번호 칩 — 스크린리더가 숫자만 읽지 않게 */
  citationChipLabel: (n: number, label: string) => `출처 ${n}: ${label} 펼치기`,
  citationListLabel: "이 문장의 출처",
  /** 출처 줄 — 이름 · 시각 */
  citationLine: (label: string, when: string) => (when ? `${label} · ${when}` : label),
  citationLinkLabel: (label: string) => `${label} 원문 새 탭에서 열기`,
  citationOpen: "원문",
} as const;
