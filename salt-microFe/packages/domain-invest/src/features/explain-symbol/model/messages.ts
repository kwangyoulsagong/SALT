import type { ExplainProvider } from "@repo/core/coach";

/** 다듬은 공급자 이름(`FE-REQ-059` FR-3) — 컴포넌트에 문자열을 두지 않는다. Gemini 는 지금 문구(이름 없이) 그대로 */
const PROVIDER_NAME: Record<Exclude<ExplainProvider, "gemini">, string> = {
  local_claude: "Claude",
  local_codex: "Codex",
};
const named = (provider: ExplainProvider | null | undefined) =>
  provider === "local_claude" || provider === "local_codex" ? PROVIDER_NAME[provider] : null;

/** 해설 기능 문구 (`i18n-policy.md`) */
export const EXPLAIN_MESSAGES = {
  heading: "AI 해설",
  /** 스트림이 끝났다는 사실 한 줄 (`FE-REQ-044` P-6) — 판단을 축하하는 말이 아니다 */
  finished: "분석이 완료됐어요",
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
  /** 서버 게이트가 닫혔다(`renderable: false`) — 화면의 판단이 그사이 바뀌었다 */
  blocked: "판단이 방금 바뀌어 해설할 근거가 부족합니다. 새로고침하면 최신 판단을 볼 수 있습니다.",
  signedOut: "로그인하면 해설을 볼 수 있습니다.",
  /** 이 모드의 판단이 막혔다 — 해설할 판단이 없다. 카드를 지우면 기능이 사라진 것처럼 보인다 */

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
  replacedNote: (provider?: ExplainProvider | null) => {
    const name = named(provider);
    return name ? `검사를 통과한 ${name} 문장으로 바꿨어요.` : "검사를 통과한 AI 문장으로 바꿨어요.";
  },
  /** 문장마다 검사하며 바로 흘렸다(로컬 Claude, `SRV-REQ-050` FR-13) — 바꾼 것이 아니다 */
  streamedNote: (provider?: ExplainProvider | null) => {
    const name = named(provider);
    return name ? `${name} 문장을 한 문장씩 검사해 보여 드렸어요.` : "AI 문장을 한 문장씩 검사해 보여 드렸어요.";
  },
  droppedNote: (count: number) => `검사에 걸린 문장 ${count}개는 근거 문장으로 대신했어요.`,
  streamedDroppedNote: (count: number) => `검사에 걸린 문장 ${count}개는 뺐어요.`,
  /** 템플릿이 최종 — AI 가 실패했거나 꺼져 있다 */
  templateNote: "근거 데이터로 만든 문장이에요. AI 다듬기는 이번에 쓰지 못했어요.",
  citationsLabel: "출처",
  /** 출처 칩 링크 — 스크린리더가 매체 이름만 읽으면 어느 기사인지 모른다 */
  citationLinkLabel: (source: string, title: string) => `${source} 원문 새 탭에서 열기: ${title}`,
} as const;
