/**
 * 소식 측정 태그(F017 단계 6 · `BFF-REQ-052` FR-5 · `FE-REQ-064` FR-5) — BFF 뷰모델 그대로. 국내 소식 · 코인 종목 뉴스 행이 같이 쓴다.
 * 숫자는 서버가 낸다(비율은 0~1 · 평균 · 선반영은 단순 비율 0.012 = +1.2%) — 화면은 퍼센트로 쓰기만.
 * 라벨 문구는 측정 이름 — 보통 올랐던 소식 · 보통 내렸던 소식 · 반응 엇갈림 · 같은 종류 n건뿐(호재 · 악재 단어 0, `ADR-009` 개정 11-10)
 */
export type NewsTagLabel = "up_usually" | "down_usually" | "mixed" | "few";

export interface NewsReaction {
  days: 1 | 5;
  /** 과거 같은 종류 사건 수(창이 닫힌 것) */
  sample: number;
  /** 시장보다 더 오른 비율 — 표본 미달이면 null */
  upRate: number | null;
  /** 평균 초과 반응(단순 비율) — 표본 미달이면 null */
  mean: number | null;
  /** 평소 시장보다 더 오른 비율 */
  baseUpRate: number | null;
}

export interface NewsTag {
  eventKind: string;
  /** 종류 이름(서버 사전 문구 — 예 "수주 · 공급계약") */
  eventKindText: string;
  label: NewsTagLabel;
  reaction: NewsReaction;
  reaction5d: NewsReaction | null;
  /** 소식 전 5거래일(코인 5일) 초과 수익(단순 비율) — 없으면 null */
  preMove5d: number | null;
}
