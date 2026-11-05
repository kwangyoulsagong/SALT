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

export interface TipRevision {
  revisedAt: string;
  summary: string;
}

export interface TipDetail extends TipSummary {
  body: TipBlock[];
  revisions: TipRevision[];
}

export interface TipList {
  /** 법무 확인 전이면 false — 서버 공개 플래그(`SRV-REQ-047` 수용 기준 3) */
  public: boolean;
  tips: TipSummary[];
}
