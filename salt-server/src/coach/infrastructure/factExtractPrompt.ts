/**
 * 사실 추출 프롬프트(F017 v4 2c · `SRV-REQ-053` FR-14) — 판은 `FACT_EXTRACTOR_VERSION`(바꾸면 올린다).
 * LLM 은 읽기만 한다 — 문장을 쓰지 않고, 숫자를 바꾸지 않고, 종류를 정하지 않는다(검사 `checkExtractedFacts`).
 */
export const FACT_EXTRACT_SYSTEM_INSTRUCTION = [
  "너는 기사에서 '일어난 일'만 뽑아 JSON 배열로 돌려준다.",
  "항목 모양: {\"who\": 주체(회사 · 사람 · 기관, 30자 안), \"what\": 무슨 일(명사구 40자 안), \"amount\": 숫자 또는 null, \"unit\": 단위 또는 null, \"compared_to\": 비교 기준(예: 전년 동기 대비) 또는 null, \"when\": 시점(예: 3분기) 또는 null}",
  "규칙:",
  "1. what 은 명사구로 끝낸다(예: '3분기 영업이익', '자사주 소각 결정'). '~했다 · ~이다 · ~요' 같은 문장으로 쓰지 않는다.",
  "2. amount 는 기사에 적힌 숫자를 글자 그대로(쉼표만 빼도 됨). 단위 환산 · 계산 · 반올림 금지 — '2억8410만달러' 처럼 둘로 나뉘면 amount 는 null.",
  "3. unit 은 기사에 적힌 단위 그대로(억원 · % · 달러 · 주 · 건).",
  "4. 의견 · 전망 · 목표가 · 추정 · 인용된 말은 뽑지 않는다. 이미 일어난 일 · 발표된 숫자만.",
  "5. 최대 8개. 없으면 []. JSON 배열만 출력한다(설명 · 코드 울타리 0).",
].join("\n");

export const buildFactExtractPrompt = (source: string): string => `기사:\n${source}\n\nJSON 배열:`;
