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

/** 바뀐 줄 — 앞 판과 견줘 빠진 줄 · 들어온 줄(FR-7 줄 diff, 서버 `LineDiff`) */
export interface TipChangeVM {
  op: "removed" | "added";
  text: string;
}

export interface TipRevisionVM {
  revisedAt: string;
  summary: string;
  /** 첫 판 · 줄을 모르는 이력이면 null(요약만), 상태만 바뀐 판이면 [] */
  changes: TipChangeVM[] | null;
}

/** 읽기 전에 맞혀 보기 — **정답 없음**(고른 뒤 채점 응답에만, 서버가 채점한다) */
export interface TipQuizVM {
  question: string;
  choices: string[];
}

export interface TipDetailVM extends TipSummaryVM {
  body: TipBlockVM[];
  /** 최근 것 먼저 — 변경 이력 공개(FR-2) */
  revisions: TipRevisionVM[];
  quiz: TipQuizVM | null;
  /** 내 숫자로 다시 읽기 칸이 있는 글인가(FR-7) — 화면이 이게 true 일 때만 `/my-numbers` 를 부른다 */
  myNumbers: boolean;
}

/** 숫자 한 칸 — 금액(원 정수) 또는 비율(문자열 "0.40") 하나. 라벨은 서버 문장 그대로 */
export interface MyFigureVM {
  key: string;
  label: string;
  amount: number | null;
  ratio: string | null;
}

/** 요건 한 줄 — met · not_met · unknown(앱이 모르거나 원천을 못 읽음) */
export interface MyCheckVM {
  key: string;
  label: string;
  state: "met" | "not_met" | "unknown";
  note: string;
}

export interface MyReadingVM {
  kind: string;
  figures: MyFigureVM[];
  checks: MyCheckVM[];
  /** 숫자를 낼 재료가 없다(목표 없음 · 원천 못 읽음) — 화면은 글의 예시 그대로 두고 이 한 줄만 */
  emptyReason: string | null;
  /** 가계부 급여로 어림했다 */
  estimated: boolean;
}

/** 내 숫자로 다시 읽기(FR-7). content 가 실패하면 reading=null · degraded — 화면은 글의 예시 그대로(FEATURE-014 "개인화 실패 시 일반 예시로") */
export interface MyNumbersVM {
  reading: MyReadingVM | null;
  degraded: boolean;
  /** 못 읽은 원천 — savings · household · content */
  degradedSources: string[];
}

export interface QuizResultVM {
  correct: boolean;
  /** 정답 보기 번호(0부터) */
  answer: number;
  explanation: string;
  /** 로그인한 풀이였나 — false 면 기록 0(화면이 "로그인하면 카드로 모아요") */
  signedIn: boolean;
  /** 이번 풀이로 처음 카드가 됐다 — 로그인 풀이에서만 true 일 수 있다 */
  collected: boolean;
}

export interface QuizCardVM {
  slug: string;
  title: string;
  question: string;
  answer: string;
  explanation: string;
  collectedAt: string;
}

export interface QuizCardsVM {
  /** 지금 풀 수 있는 문제 수 — 모음의 분모 */
  available: number;
  cards: QuizCardVM[];
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

/** 내 숫자 — 원천(저축 · 가계부) 각각과 content 계산의 예산. 원천이 늦으면 그 원천만 "못 읽음"으로 넘긴다 */
export const MY_NUMBERS_BUDGET_MS = 1500;

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

const change = (c: Record<string, unknown>): TipChangeVM => ({ op: c.op === "removed" ? "removed" : "added", text: String(c.text ?? "") });

const quiz = (q: Record<string, unknown>): TipQuizVM => ({ question: String(q.question), choices: ((q.choices as unknown[]) ?? []).map(String) });

const statusOf = (error: unknown): number | undefined => (error as { response?: { status?: number } }).response?.status;

/** 원 단위 정수 문자열 — 서버 응답은 이미 정수(Long). 아니면 던진다(그 원천만 "못 읽음") — BFF 가 반올림 · 자르기를 하지 않는다 */
const wholeWon = (v: unknown): string => {
  const n = Number(v);
  if (!Number.isSafeInteger(n) || n < 0) throw new Error("source amount is not whole won");
  return String(n);
};

const STATES = new Set(["met", "not_met", "unknown"]);

const reading = (d: Record<string, unknown>): MyReadingVM => ({
  kind: String(d.kind),
  figures: ((d.figures as Record<string, unknown>[]) ?? []).map((f) => ({
    key: String(f.key),
    label: String(f.label),
    amount: f.amount == null ? null : Number(f.amount),
    ratio: f.ratio == null ? null : String(f.ratio),
  })),
  checks: ((d.checks as Record<string, unknown>[]) ?? []).map((c) => ({
    key: String(c.key),
    label: String(c.label),
    state: (STATES.has(String(c.state)) ? String(c.state) : "unknown") as MyCheckVM["state"],
    note: String(c.note),
  })),
  emptyReason: d.emptyReason == null ? null : String(d.emptyReason),
  estimated: Boolean(d.estimated),
});

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
      revisions: ((d.revisions as Record<string, unknown>[]) ?? []).map((r) => ({
        revisedAt: String(r.revisedAt),
        summary: String(r.summary),
        changes: Array.isArray(r.changes) ? (r.changes as Record<string, unknown>[]).map(change) : null,
      })),
      quiz: d.quiz ? quiz(d.quiz as Record<string, unknown>) : null,
      myNumbers: Boolean(d.myNumbers),
    };
  }

  /**
   * 퀴즈 풀이(FR-8) — 세션이 있으면 서버가 채점 + 기록(카드), 없으면 채점만(기록 0). 정답 판정은 늘 서버다.
   * 세션이 있는데 서버가 401 이면 그대로 올린다 — 화면이 세션을 갱신하고 다시 부른다(익명 채점으로 몰래 바꾸지 않는다: 카드를 잃는다).
   */
  async answerQuiz(token: string | undefined, slug: string, choice: number): Promise<QuizResultVM> {
    if (!Number.isInteger(choice) || choice < 0) throw new AppError("choice must be a non-negative integer", 400, true, "INVALID_QUIZ_CHOICE");
    const path = encodeURIComponent(slug);
    const { data } = token
      ? await backendApi.proxyAuthRequest("POST", `/content/me/quiz/${path}`, token, { choice })
      : await backendApi.proxyRequest("POST", `/content/tips/${path}/quiz`, { choice });
    const d = data.data as Record<string, unknown>;
    return {
      correct: Boolean(d.correct),
      answer: Number(d.answer),
      explanation: String(d.explanation),
      signedIn: Boolean(token),
      collected: Boolean(token) && Boolean(d.collected),
    };
  }

  async quizCards(token: string): Promise<QuizCardsVM> {
    const { data } = await backendApi.proxyAuthRequest("GET", "/content/me/quiz-cards", token);
    const d = data.data as { available: number; cards: Record<string, unknown>[] };
    return {
      available: Number(d.available),
      cards: (d.cards ?? []).map((c) => ({
        slug: String(c.slug),
        title: String(c.title),
        question: String(c.question),
        answer: String(c.answer),
        explanation: String(c.explanation),
        collectedAt: String(c.collectedAt),
      })),
    };
  }

  /**
   * 내 숫자로 다시 읽기(FR-7, 금융 팁 S2d) — **BFF 가 순서를 정한다**(`msa-services.md` §5): 원천 둘(저축 목표 · 가계부 급여)을
   * 나란히 읽고 → content 에 사실로 넘겨 계산. 서비스끼리 부르지 않는다. BFF 는 칸을 고를 뿐 금액을 계산하지 않는다.
   * 원천 하나가 늦거나 실패하면 그 원천만 "못 읽음"(goals=null · wage unread) — content 가 그 요건을 unknown 으로 답한다.
   * 401 은 어디서 나든 그대로 올린다(`bff-architecture.md` §5). 급여는 로그 0.
   */
  async myNumbers(token: string, slug: string): Promise<MyNumbersVM> {
    if (!slug) throw new AppError("slug is required", 400, true, "INVALID_TIP_SLUG");
    const opts = { timeout: MY_NUMBERS_BUDGET_MS };
    const [goalsRes, wageRes] = await Promise.allSettled([
      backendApi.proxyAuthRequest("GET", "/savings/goals", token, undefined, opts),
      backendApi.proxyAuthRequest("GET", "/household/settings/work-hours", token, undefined, opts),
    ]);
    const degradedSources: string[] = [];
    for (const r of [goalsRes, wageRes]) if (r.status === "rejected" && statusOf(r.reason) === 401) throw r.reason;

    // 원천 응답 모양이 틀려도(금액이 정수가 아님) 그 원천만 "못 읽음" — 틀린 숫자로 계산하지 않는다
    let goals: Record<string, unknown>[] | null = null;
    try {
      if (goalsRes.status !== "fulfilled") throw goalsRes.reason;
      goals = ((goalsRes.value.data.data as Record<string, unknown>[]) ?? []).map((g) => ({
        template: String(g.template),
        status: String(g.status),
        saved: wholeWon(g.saved),
        monthlyPlan: g.monthlyPlan == null ? null : wholeWon(g.monthlyPlan),
        targetDate: g.targetDate == null ? null : String(g.targetDate),
      }));
    } catch {
      degradedSources.push("savings");
    }

    let wage: Record<string, unknown> = { state: "unread" };
    try {
      if (wageRes.status !== "fulfilled") throw wageRes.reason;
      const w = wageRes.value.data.data as Record<string, unknown>;
      // 끈 칸은 쓰지 않는다 — 사용자가 끈 급여를 다른 화면이 몰래 쓰지 않게
      wage = w.on && w.basis && w.amount != null
        ? { state: "set", basis: String(w.basis), amount: wholeWon(w.amount), monthlyHours: w.monthlyHours == null ? null : Number(w.monthlyHours) }
        : { state: "not_set" };
    } catch {
      degradedSources.push("household");
    }

    try {
      const { data } = await backendApi.proxyAuthRequest("POST", `/content/me/tips/${encodeURIComponent(slug)}/my-numbers`, token, { goals, wage }, opts);
      const d = data.data as Record<string, unknown>;
      return { reading: reading(d), degraded: degradedSources.length > 0, degradedSources };
    } catch (error) {
      const status = statusOf(error);
      // 401 · 404(칸 없는 글 · 공개 전) · 400 은 화면이 알아야 한다 — 숨기지 않는다
      if (status !== undefined && status < 500) throw error;
      logger.warn("tips my-numbers degraded", { status: status ?? "timeout", sources: degradedSources.join(",") });
      return { reading: null, degraded: true, degradedSources: [...degradedSources, "content"] };
    }
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
