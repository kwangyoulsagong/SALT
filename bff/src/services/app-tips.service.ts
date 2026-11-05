import { logger } from "../config/logger";
import { AppError } from "../utils/error.util";
import { backendApi } from "./backend-api.service";

/**
 * 금융 팁 화면 계약 (`BFF-REQ-049`, 서버 `SRV-REQ-047` — Kotlin `content` 서비스, 라우팅 표 `/content` → platform).
 *
 * **문장 · 메타는 서버 원문 그대로**다 — BFF 는 화면 필드만 고른다. 공개 목록 · 글은 인증 없음 · 사용자 데이터 0(FR-1).
 * 때맞춘 팁은 로그인 필요 · 0~1건(FR-3), 서버가 늦거나 실패하면 카드를 안 띄운다(`tip: null` + `degraded`, FR-4 —
 * 카드가 없는 화면이 "일반 예시"다: 때맞춘 팁은 있으면 한 줄 더 보일 뿐 화면의 본문이 아니다).
 */

// ---------- 화면 계약 — 웹 `@repo/domain-tips` model/types.ts 와 같은 모양 ----------

export interface TipMetaVM {
  sourceUrl: string;
  sourceName: string;
  writtenOn: string;
  reviewedOn: string;
  baseYear: number;
  validUntil: string;
}

export interface TipSummaryVM {
  slug: string;
  title: string;
  summary: string;
  /** published · needs_check(유효기한 지남 — "확인 필요" 띠) */
  status: string;
  /** 검색엔진 색인 금지 — 확인 필요 글(FR-2). 법무 확인 전 전역 noindex 는 화면 zone 몫(`FE-REQ-058`) */
  noindex: boolean;
  meta: TipMetaVM;
}

export type TipBlockVM = { type: "heading" | "paragraph"; text: string } | { type: "bullets"; items: string[] };

export interface TipDetailVM extends TipSummaryVM {
  body: TipBlockVM[];
  /** 최근 것 먼저 — 변경 이력 공개(FR-2) */
  revisions: { revisedAt: string; summary: string }[];
}

export interface TipListVM {
  /** 법무 확인 전이면 false · tips 빈 배열 — 화면은 "준비 중" */
  public: boolean;
  tips: TipSummaryVM[];
}

export interface TimelyTipVM {
  slug: string;
  title: string;
  summary: string;
  /** goal_created:wedding · month:12 … — 계측(트리거별 노출 · 닫기, FEATURE-014 NFR) 키 */
  trigger: string;
  sourceUrl: string;
  sourceName: string;
  validUntil: string;
}

export interface TipForMeVM {
  tip: TimelyTipVM | null;
  /** 서버가 늦거나 실패해 카드를 비웠다 */
  degraded: boolean;
}

/** 때맞춘 팁 예산 — 화면의 곁 칸이라 짧게. 넘기면 카드 없이(`performance-bff.md` §3) */
export const TIP_FOR_ME_BUDGET_MS = 1500;

const CONTEXTS = new Set(["home", "savings", "household"]);

const meta = (m: Record<string, unknown>): TipMetaVM => ({
  sourceUrl: String(m.sourceUrl),
  sourceName: String(m.sourceName),
  writtenOn: String(m.writtenOn),
  reviewedOn: String(m.reviewedOn),
  baseYear: Number(m.baseYear),
  validUntil: String(m.validUntil),
});

const summary = (t: Record<string, unknown>): TipSummaryVM => ({
  slug: String(t.slug),
  title: String(t.title),
  summary: String(t.summary),
  status: String(t.status),
  noindex: Boolean(t.noindex),
  meta: meta((t.meta ?? {}) as Record<string, unknown>),
});

const block = (b: Record<string, unknown>): TipBlockVM =>
  b.type === "bullets"
    ? { type: "bullets", items: ((b.items as unknown[]) ?? []).map(String) }
    : { type: b.type === "heading" ? "heading" : "paragraph", text: String(b.text ?? "") };

class AppTipsService {
  async list(): Promise<TipListVM> {
    const { data } = await backendApi.proxyRequest("GET", "/content/tips");
    const d = data.data as { public: boolean; tips: Record<string, unknown>[] };
    return { public: Boolean(d.public), tips: (d.tips ?? []).map(summary) };
  }

  async detail(slug: string): Promise<TipDetailVM> {
    const { data } = await backendApi.proxyRequest("GET", `/content/tips/${encodeURIComponent(slug)}`);
    const d = data.data as Record<string, unknown>;
    return {
      ...summary(d),
      body: ((d.body as Record<string, unknown>[]) ?? []).map(block),
      revisions: ((d.revisions as Record<string, unknown>[]) ?? []).map((r) => ({ revisedAt: String(r.revisedAt), summary: String(r.summary) })),
    };
  }

  /** 맥락은 서버와 같은 세 값 — 틀리면 서버까지 가지 않고 400(서버 코드와 같은 `INVALID_TIP_CONTEXT`). 실패는 카드 없이 */
  async forMe(token: string, context: string): Promise<TipForMeVM> {
    if (!CONTEXTS.has(context)) throw new AppError("context must be one of home, savings, household", 400, true, "INVALID_TIP_CONTEXT");
    try {
      const { data } = await backendApi.proxyAuthRequest("GET", `/content/me/tip?context=${context}`, token, undefined, { timeout: TIP_FOR_ME_BUDGET_MS });
      const tip = (data.data as { tip: Record<string, unknown> | null }).tip;
      return {
        tip: tip
          ? {
              slug: String(tip.slug),
              title: String(tip.title),
              summary: String(tip.summary),
              trigger: String(tip.trigger),
              sourceUrl: String(tip.sourceUrl),
              sourceName: String(tip.sourceName),
              validUntil: String(tip.validUntil),
            }
          : null,
        degraded: false,
      };
    } catch (error) {
      const status = (error as { response?: { status?: number } }).response?.status;
      // 401 은 화면이 로그인으로 보내야 한다 — 숨기지 않는다
      if (status === 401) throw error;
      logger.warn("tips for-me degraded", { status: status ?? "timeout" });
      return { tip: null, degraded: true };
    }
  }

  async dismiss(token: string, slug: string): Promise<{ slug: string; dismissed: boolean }> {
    const { data } = await backendApi.proxyAuthRequest("POST", `/content/me/tips/${encodeURIComponent(slug)}/dismiss`, token);
    const d = data.data as { slug: string; dismissed: boolean };
    return { slug: String(d.slug), dismissed: Boolean(d.dismissed) };
  }
}

export const appTipsService = new AppTipsService();
