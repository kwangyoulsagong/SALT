import type { MoveSummaryPrompt, MoveSummaryFactKind } from "../domain";

/**
 * 오늘 등락 한 줄(③) 프롬프트 — F016 단계 D · `SRV-REQ-052` FR-3. 버전은 `MOVE_SUMMARY_PROMPT_VERSION`(바꾸면 올린다 — 지문이 바뀐다).
 *
 * 숫자를 주입하지 않는다 — 분해 숫자는 ①이 보이고, 문장은 인용한 사실 글의 숫자만 쓸 수 있다(검사 `verifyMoveSummary`).
 * 그래서 몫은 "무엇이 가장 컸나"를 말로만 준다. 기사 본문 · 링크 0(`ADR-009` 개정 — 제목만)
 */

export const MOVE_SUMMARY_SYSTEM_INSTRUCTION = [
  "너는 한 종목의 지난 하루에 있었던 일을 한국어 한 문장으로 묶는다.",
  "규칙:",
  "1. 아래 번호 붙은 사실만 말한다. 말한 사실마다 문장에 번호를 [n] 처럼 붙인다(하나 이상).",
  "2. 원인을 단정하지 않는다. '때문 · 영향 · 덕분 · 탓 · 여파 · 호재 · 악재 · 이유로 · 힘입어 · 견인' 같은 말을 쓰지 않는다. 같은 날 있었던 일로만 말한다(예: '~ 공시가 있었어요', '~ 뒤 VI가 발동됐어요').",
  "3. 앞날 · 전망 · 기대 · 가능성 · 매매 권유를 쓰지 않는다.",
  "4. 숫자는 사실 글에 있는 것만 쓴다. 오늘 등락률 · 몫 숫자는 쓰지 않는다.",
  "5. 한 문장 · 80자 안팎 · 해요체. 문장만 출력한다(설명 · 따옴표 · 머리말 0).",
].join("\n");

const KIND_LABEL: Record<MoveSummaryFactKind, string> = {
  news: "시황",
  disclosure: "공시",
  vi: "VI",
  market_action: "시장 조치",
  halt: "정지",
  warning: "시장 경보",
  flow: "수급",
  crypto_news: "기사",
  crypto_warning: "거래소",
};

const DOMINANT: Record<MoveSummaryPrompt["dominant"], string> = {
  idio: "이 종목만의 움직임이 가장 컸어요",
  market: "시장 전체 흐름이 가장 컸어요",
  sector: "업종 흐름이 가장 컸어요",
};

const kstClock = (d: Date): string =>
  new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hour12: false }).format(d);

export const buildMoveSummaryPrompt = (p: MoveSummaryPrompt): string =>
  [
    `종목: ${p.name} (${p.asset === "kr" ? "국내 주식" : "코인"})`,
    `오늘: ${p.direction === "up" ? "올랐어요" : "내렸어요"} · ${DOMINANT[p.dominant]}`,
    "같은 날 사실:",
    ...p.facts.map((f) => `[${f.n}] ${kstClock(f.at)} · ${KIND_LABEL[f.kind]} · ${f.source} · ${f.text}`),
  ].join("\n");

/** 모델이 붙이는 머리말 · 따옴표 · 줄바꿈을 걷는다 — 검사 전 모양만(내용은 검사가 본다) */
export const cleanMoveSummaryOutput = (raw: string): string =>
  raw
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(문장|답|요약)\s*[:：]\s*/u, "")
    .replace(/^["'“”‘’]+|["'“”‘’]+$/gu, "")
    .trim();
