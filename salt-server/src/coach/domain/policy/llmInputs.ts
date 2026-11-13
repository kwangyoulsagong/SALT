/**
 * AI(LLM)로 보내는 것 — 설정 화면 "AI 로 가는 것" 의 원천(`SRV-REQ-048` FR-6 · `FE-REQ-055` FR-7, 서버 S3d 2026-11-13).
 *
 * LLM 을 부르는 곳은 코치 배치 둘뿐이다 — 종목 해설 스냅샷(`GenerateExplanationSnapshots`)과 오늘 등락 한 줄(`GenerateMoveSummaries`).
 * 둘 다 종목마다 돌고 **입력은 시장 사실**이다. 사람의 기록(보유 · 거래 · 가계부 · 저축 · 감정)은 0 —
 * `ExplainCaller.userId` 가 타입으로 `null` 이고, 아래 `fields` 는 프롬프트가 실제로 읽는 입력 칸과 시험(`llmInputs.test.ts`)으로 묶인다.
 * 프롬프트에 칸을 더하면 시험이 깨고, 여기 한 줄을 더해야 지나간다 — 화면 공개가 코드보다 늦지 않게.
 */
export interface LlmInputItem {
  /** 화면에 그대로 나오는 설명 */
  about: string;
  /** 프롬프트가 읽는 입력 칸(`CoachExplanationInput` · `MoveSummaryPrompt` 키) */
  fields: readonly string[];
  /** 사람의 기록인가 — 지금은 전부 false. true 가 생기면 화면이 "내 기록이 AI 로 가요"로 바뀐다 */
  personal: boolean;
}

export interface LlmInputJob {
  job: "explanation" | "move_summary";
  about: string;
  inputs: readonly LlmInputItem[];
}

export const LLM_INPUTS: readonly LlmInputJob[] = [
  {
    job: "explanation",
    about: "종목 해설",
    inputs: [
      { about: "종목 코드 · 이름", fields: ["symbol", "koreanName"], personal: false },
      { about: "판단 기간(단타 · 장기)", fields: ["mode"], personal: false },
      { about: "현재가 · 24시간 변동률 · 거래대금", fields: ["currentPrice", "change24h", "tradeValue24h"], personal: false },
      { about: "판단 근거 지표(이름과 값)", fields: ["evidence"], personal: false },
      { about: "관련 뉴스 제목 · 요약 · 출처 · 분위기", fields: ["news"], personal: false },
    ],
  },
  {
    job: "move_summary",
    about: "오늘 등락 한 줄",
    inputs: [
      { about: "종목 이름 · 시장(코인 · 국내 주식)", fields: ["name", "asset"], personal: false },
      { about: "오늘 오름 · 내림과 가장 큰 몫(종목 · 시장 · 업종)", fields: ["direction", "dominant"], personal: false },
      { about: "같은 날 사실(시각 · 종류 · 출처 · 내용)", fields: ["facts"], personal: false },
    ],
  },
];
