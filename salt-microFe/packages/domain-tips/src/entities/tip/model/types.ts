/**
 * 금융 팁 화면 계약 — BFF `app-tips.service.ts` 뷰모델과 같은 모양(`BFF-REQ-049`). 문장 · 메타는 서버 원문 그대로다.
 */
export interface TipMeta {
  sourceUrl: string;
  sourceName: string;
  /** YYYY-MM-DD */
  writtenOn: string;
  reviewedOn: string;
  baseYear: number;
  validUntil: string;
}

export enum TipStatus {
  Published = "published",
  /** 유효기한 지남 — "확인 필요" 띠 · noindex(FR-2) */
  NeedsCheck = "needs_check",
}

export interface TipSummary {
  slug: string;
  title: string;
  summary: string;
  status: TipStatus;
  noindex: boolean;
  meta: TipMeta;
}

export enum TipBlockType {
  Heading = "heading",
  Paragraph = "paragraph",
  Bullets = "bullets",
}

export type TipBlock = { type: TipBlockType.Heading | TipBlockType.Paragraph; text: string } | { type: TipBlockType.Bullets; items: string[] };

export enum TipChangeOp {
  Removed = "removed",
  Added = "added",
}

/** 앞 판과 견줘 바뀐 줄(FR-7 줄 diff) — 서버가 비교한다 */
export interface TipChange {
  op: TipChangeOp;
  text: string;
}

export interface TipRevision {
  revisedAt: string;
  summary: string;
  /** 첫 판 · 줄을 모르는 이력이면 null(요약만), 상태만 바뀐 판이면 [] */
  changes: TipChange[] | null;
}

/** 읽기 전에 맞혀 보기(FR-8) — 정답 없음. 채점은 서버 */
export interface TipQuiz {
  question: string;
  choices: string[];
}

export interface TipDetail extends TipSummary {
  body: TipBlock[];
  revisions: TipRevision[];
  quiz: TipQuiz | null;
  /** 내 숫자로 다시 읽기 칸이 있는 글인가(FR-3, S2d) — 서버 원문 `my_numbers` */
  myNumbers: boolean;
}

/** 숫자 한 칸 — 금액(원) 또는 비율("0.40") 하나. 라벨 · 값은 서버(화면 계산 0) */
export interface MyFigure {
  key: string;
  label: string;
  amount: number | null;
  ratio: string | null;
}

export enum MyCheckState {
  Met = "met",
  NotMet = "not_met",
  Unknown = "unknown",
}

/** 요건 한 줄 — 앱이 모르는 요건 · 못 읽은 원천은 unknown */
export interface MyCheck {
  key: string;
  label: string;
  state: MyCheckState;
  note: string;
}

export interface MyReading {
  kind: string;
  figures: MyFigure[];
  checks: MyCheck[];
  /** 숫자를 낼 재료가 없다 — 글의 예시 그대로 두고 이 한 줄만 */
  emptyReason: string | null;
  /** 가계부 급여로 어림했다 */
  estimated: boolean;
}

/** 내 숫자로 다시 읽기(`BFF-REQ-049` FR-7) — reading 이 null 이면 서버가 실패: 글의 예시 그대로 */
export interface MyNumbers {
  reading: MyReading | null;
  degraded: boolean;
  degradedSources: string[];
}

export interface QuizResult {
  correct: boolean;
  /** 정답 보기 번호(0부터) */
  answer: number;
  explanation: string;
  /** 로그인한 풀이였나 — false 면 기록 0 */
  signedIn: boolean;
  /** 이번 풀이로 처음 카드가 됐다 */
  collected: boolean;
}

export interface QuizCard {
  slug: string;
  title: string;
  question: string;
  answer: string;
  explanation: string;
  collectedAt: string;
}

export interface QuizCards {
  /** 지금 풀 수 있는 문제 수 — 모음의 분모 */
  available: number;
  cards: QuizCard[];
}

export interface TipList {
  /** 법무 확인 전이면 false — 서버 공개 플래그(`SRV-REQ-047` 수용 기준 3) */
  public: boolean;
  tips: TipSummary[];
}
