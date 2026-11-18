import { withJosa } from "../../../shared/lib/josa";

/**
 * 해설 에이전트 도구(O3) — `SRV-REQ-059` · `FC-REQ-023` FR-1~6. **순수 규칙**: 도구 메뉴 · 고른 호출 검사 · 도구 결과 → 출처 있는 사실 줄.
 *
 * 에이전트는 **고르기만** 한다 — 어느 도구를 어느 대상에 부를지. 숫자는 예측 계약 뷰가 내고(채점된 것만), 문장은 기존 해설 작성기가
 * 쓰고, 기존 검증기(숫자 대조 · 금지어 · 명령형 · 인용)가 거른다. 도구 결과 줄은 해설 입력 `tools` 로 들어가 검증기의 허용 숫자 ·
 * 인용 사실표가 된다 — 도구 결과에 없는 숫자는 문장에 남지 못한다.
 *
 * - 대상은 닫힌 집합 — 이 종목 + 앞 호출이 돌려준 이웃 종목뿐. 모델이 지어낸 id · 사건 종류는 버린다
 * - 호출 상한 4 · 왕복 2 · 이웃 2홉(3홉은 허브 종목에서 1초대이고 이 종목과 관계가 약하다 — 2026-11-18 실측)
 * - 개인 금액(보유 수량 · 평단 · 원화 손익)은 이 파일 어느 타입에도 없다(FR-4)
 */

/** 도구 넷(`ontology.md` §6) — 이 목록 밖 이름은 버린다 */
export const AGENT_TOOL_NAMES = ["get_forecast_card", "get_neighbors", "get_event_reactions", "get_documents"] as const;
export type AgentToolName = (typeof AGENT_TOOL_NAMES)[number];

export const AGENT_LIMITS = {
  /** 한 해설에서 도구 호출 합 */
  calls: 4,
  /** 고르기 왕복 — 1회차 결과(이웃)를 보고 2회차에 이웃의 문서 · 반응을 부를 수 있다 */
  rounds: 2,
  neighborDepth: 2,
  documentDays: 30,
  /** 도구 하나가 해설에 싣는 줄 */
  linesPerCall: 3,
  /** 해설에 싣는 도구 줄 합 — 프롬프트를 사실로 채우지 않는다 */
  facts: 8,
} as const;

export type AgentAsset = "kr" | "crypto";

/** 예측 온톨로지 엔티티 id(`asset:kr:005930` · `asset:crypto:BTC`) — 코치 심볼은 맨 코드 */
export const agentEntityId = (asset: AgentAsset, symbol: string): string => `asset:${asset}:${symbol.toUpperCase()}`;

const ENTITY = /^asset:(kr|crypto):([A-Z0-9]{1,20})$/;
/** 엔티티 id → (시장, 코치 심볼). 종목이 아니면 null */
export const parseAgentEntity = (id: string): { asset: AgentAsset; symbol: string } | null => {
  const m = ENTITY.exec(id);
  return m ? { asset: m[1] as AgentAsset, symbol: m[2]! } : null;
};

/** 사건 종류 이름 — 이름이 없는 종류는 메뉴에 올리지 않는다(영문 코드를 문장에 흘리지 않는다) */
export const AGENT_EVENT_LABEL: Readonly<Record<string, string>> = {
  earnings: "실적 공시",
  kr_earnings: "실적 공시",
  buyback: "자사주 공시",
  contract: "공급 계약 공시",
  dividend: "배당 공시",
  ir: "기업설명회 공시",
  legal: "소송 · 제재 공시",
  mna: "인수 · 합병 공시",
  rights_offering: "유상증자 공시",
  funding_long_crowded: "선물 매수 쏠림",
  funding_short_crowded: "선물 매도 쏠림",
  kimchi_cross_up: "김치 프리미엄 상향 돌파",
  kimchi_cross_down: "김치 프리미엄 하향 돌파",
};

/**
 * 종목에 닿은 사건 종류(온톨로지 `affects` — 일정 · 신호) → 반응 통계 종류. 반응 도구는 **최근 실제로 일어난 사건만** 메뉴에 올린다 —
 * 늘 올리면 사건 없는 날에 "과거 실적 공시 뒤 47%"를 끼워 넣는다(2026-11-18 블라인드 A/B ② 평가자 셋 공통 지적, 3 : 17)
 */
export const AGENT_EVENT_REACTION_KINDS: Readonly<Record<string, readonly string[]>> = {
  kr_earnings: ["kr_earnings", "earnings"],
  kr_ir: ["ir"],
  funding_long_crowded: ["funding_long_crowded"],
  funding_short_crowded: ["funding_short_crowded"],
  kimchi_cross_up: ["kimchi_cross_up"],
  kimchi_cross_down: ["kimchi_cross_down"],
};

/** "최근"의 폭 — 관점의 판단 기간 안팎(단타 24시간 → 3일 · 장기 30일 → 20일) */
export const AGENT_RECENT_EVENT_DAYS: Readonly<Record<"scalp" | "long_term", number>> = { scalp: 3, long_term: 20 };

export interface AgentRecentEvent {
  kind: string;
  observedAt: Date;
}

/** 고르기 메뉴 — 최근 사건이 있고 그 반응 통계가 있는 종류만. 같은 반응 종류가 둘이면 가장 최근 사건 날짜 */
export const agentEventMenu = (
  recent: readonly AgentRecentEvent[],
  withStats: ReadonlySet<string>
): Array<{ kind: string; occurredAt: Date }> => {
  const out = new Map<string, Date>();
  for (const e of recent) {
    for (const kind of AGENT_EVENT_REACTION_KINDS[e.kind] ?? []) {
      if (!withStats.has(kind) || AGENT_EVENT_LABEL[kind] === undefined) continue;
      const prev = out.get(kind);
      if (!prev || e.observedAt > prev) out.set(kind, e.observedAt);
    }
  }
  return [...out].map(([kind, occurredAt]) => ({ kind, occurredAt }));
};

export interface AgentToolCall {
  tool: AgentToolName;
  /** 엔티티 id — 이 종목 또는 앞 결과의 이웃 종목 */
  entity: string;
  /** `get_event_reactions` 만 */
  eventKind?: string;
}

/** 도구 결과 한 줄 — 해설 입력 `tools.facts` 의 원소. 숫자 · 출처 · 시각이 같이 다닌다(FR-2) */
export interface AgentToolFact {
  /** 인용 id — `tool-<n>` */
  id: string;
  tool: AgentToolName;
  text: string;
  /** 기사 · 공시 제목 줄 — 그 숫자는 뉴스 칸에서만 쓴다(기사 숫자 규칙과 같다, `allowedFacts`) */
  news: boolean;
  source: { name: string; url: string | null; at: string | null };
}

// ── 예측 뷰 행(도메인 모양 — 리더가 옮긴다) ─────────────────────────────

export interface AgentForecastCardRow {
  horizonWeeks: number;
  pUp: number;
  /** 로그수익률 분위수 */
  q05: number;
  q95: number;
  sample: number;
  directionCalls: number;
  directionHits: number;
  alwaysUpRate: number | null;
  missCount: number | null;
  modelVersion: string;
  asOf: Date;
}

export interface AgentNeighborRow {
  entity: string;
  kind: string;
  name: string;
  hop: number;
  viaPredicate: string;
  sharedDocuments: number;
  sourceKind: string;
  availableAt: Date;
}

export interface AgentReactionRow {
  family: "event_window" | "news_reaction" | "signal" | "earnings";
  eventKind: string;
  scope: "market" | "symbol";
  scopeKey: string;
  variant: string | null;
  horizon: number;
  sample: number;
  upRate: number;
  baseUpRate: number | null;
  sourceKey: string;
  asOf: Date;
}

export interface AgentDocumentRow {
  document: string;
  title: string;
  predicate: string;
  sourceKind: string;
  /** 일어난 시각(공시 접수 · 기사 게시) — 날짜 표시 · "최근" 기준 */
  observedAt: Date;
  /** 알게 된 시각 — as-of 거르기만(백필한 옛 공시는 백필한 날이다) */
  availableAt: Date;
  sourceUrl: string | null;
}

// ── 고르기 ────────────────────────────────────────────────────────────

/**
 * 모델 출력 → 호출 후보. JSON 한 덩어리(`{"calls":[…]}`) — 앞뒤 말 · 코드 울타리는 벗긴다.
 * 못 읽으면 `null`(고르기 실패 → 정해 둔 한 바퀴), 읽었는데 빈 목록이면 `[]`(모델이 "부를 것 없음"이라 답한 것 — 부르지 않는다)
 */
export const parseAgentPlan = (output: string): Array<{ tool?: unknown; entity?: unknown; event_kind?: unknown }> | null => {
  const start = output.indexOf("{");
  const end = output.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(output.slice(start, end + 1)) as { calls?: unknown };
    return Array.isArray(parsed.calls) ? (parsed.calls as Array<{ tool?: unknown; entity?: unknown; event_kind?: unknown }>) : null;
  } catch {
    return null;
  }
};

const callKey = (c: AgentToolCall) => `${c.tool}|${c.entity}|${c.eventKind ?? ""}`;

/**
 * 후보 → 받아들인 호출. 버리는 것: 모르는 도구 · 닫힌 집합 밖 대상 · 메뉴 밖 사건 종류 · 이미 부른 호출 · 상한 넘침.
 * 순서는 모델이 쓴 순서(앞이 더 중요하다고 본 것)
 */
export const acceptAgentCalls = (
  raw: ReadonlyArray<{ tool?: unknown; entity?: unknown; event_kind?: unknown }>,
  ctx: { entities: ReadonlySet<string>; eventKinds: ReadonlySet<string>; done: ReadonlySet<string>; remaining: number }
): AgentToolCall[] => {
  const out: AgentToolCall[] = [];
  const seen = new Set(ctx.done);
  for (const r of raw) {
    if (out.length >= ctx.remaining) break;
    if (typeof r.tool !== "string" || !(AGENT_TOOL_NAMES as readonly string[]).includes(r.tool)) continue;
    if (typeof r.entity !== "string" || !ctx.entities.has(r.entity)) continue;
    const call: AgentToolCall = { tool: r.tool as AgentToolName, entity: r.entity };
    if (call.tool === "get_event_reactions") {
      if (typeof r.event_kind !== "string" || !ctx.eventKinds.has(r.event_kind)) continue;
      call.eventKind = r.event_kind;
    }
    const key = callKey(call);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(call);
  }
  return out;
};

export const agentCallKey = callKey;

/**
 * 고르기가 실패했을 때(모델 실패 · 못 읽는 답 · 낸 호출을 전부 버림) — 정해 둔 한 바퀴: 전망 카드 · 이웃 · 문서 · 사건 반응(메뉴 첫 종류).
 * 에이전트가 고르지 못해도 해설은 같은 도구 사실로 간다(FR-5 — 빈칸 0)
 */
export const defaultAgentPlan = (entity: string, eventKinds: readonly string[]): AgentToolCall[] => [
  { tool: "get_forecast_card", entity },
  { tool: "get_neighbors", entity },
  { tool: "get_documents", entity },
  ...(eventKinds[0] ? [{ tool: "get_event_reactions" as const, entity, eventKind: eventKinds[0] }] : []),
];

// ── 결과 → 사실 줄 ───────────────────────────────────────────────────

const pct = (x: number) => `${Math.round(x * 100)}%`;
const signedPct = (logReturn: number) => {
  const v = (Math.exp(logReturn) - 1) * 100;
  return `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
};
const mmdd = (d: Date) => {
  const k = new Date(d.getTime() + 9 * 3_600_000);
  return `${k.getUTCMonth() + 1}월 ${k.getUTCDate()}일`;
};

/**
 * 주간 전망 카드 — 채점 통과(`renderable`) 행만, 가장 짧은 기간 하나. 확률 · 구간과 3종(채점 이력 · 기준 대비 · 빗나간 수)이
 * 한 줄에 같이 간다(`ADR-003` — 셋 중 하나라도 없으면 싣지 않는다). 소유자 전용 숫자라 이 사실이 든 해설도 소유자 전용이다
 */
export const forecastCardFacts = (name: string, rows: readonly AgentForecastCardRow[]): Omit<AgentToolFact, "id">[] => {
  const row = [...rows]
    .filter((r) => r.directionCalls > 0 && r.alwaysUpRate !== null && r.missCount !== null)
    .sort((a, b) => a.horizonWeeks - b.horizonWeeks)[0];
  if (!row) return [];
  return [
    {
      tool: "get_forecast_card",
      news: false,
      text:
        `${name} ${row.horizonWeeks}주 전망: 오를 확률 ${pct(row.pUp)} · 90% 구간 ${signedPct(row.q05)} ~ ${signedPct(row.q95)} ` +
        `(방향 판정 ${row.directionCalls}번 중 ${row.directionHits}번 맞음 · 같은 기간 늘 오른다 ${pct(row.alwaysUpRate!)} · 구간 밖 ${row.missCount}번)`,
      source: { name: "SALT 주간 전망(채점 통과)", url: null, at: row.asOf.toISOString() },
    },
  ];
};

/**
 * 이웃 — 같이 언급된 종목(문서 3건 이상, 많은 순 셋). 같은 업종 종목 나열은 싣지 않는다 — 판단을 설명하지 않는 군더더기였다
 * (2026-11-18 블라인드 A/B ② 평가자 공통 지적). 시장 전체(코스피 · 코스닥)는 관계가 아니라 분류라 싣지 않는다
 */
export const AGENT_CO_MENTION_MIN = 3;

export const neighborFacts = (name: string, rows: readonly AgentNeighborRow[]): Omit<AgentToolFact, "id">[] => {
  const co = rows
    .filter((r) => r.kind === "asset" && !r.entity.startsWith("asset:market:") && parseAgentEntity(r.entity))
    .filter((r) => r.sharedDocuments >= AGENT_CO_MENTION_MIN)
    .sort((a, b) => b.sharedDocuments - a.sharedDocuments)
    .slice(0, 3);
  if (co.length === 0) return [];
  const latest = co.reduce((m, r) => (r.availableAt > m ? r.availableAt : m), co[0]!.availableAt);
  return [
    {
      tool: "get_neighbors",
      news: false,
      text: `최근 30일 ${withJosa(name, "와/과")} 같이 언급된 종목: ${co.map((r) => `${r.name}(${r.sharedDocuments}건)`).join(" · ")}`,
      source: { name: "소식 제목 연결", url: null, at: latest.toISOString() },
    },
  ];
};

/**
 * 사건 반응 — 그 종목에 최근 일어난 사건(`occurredAt`) 뒤 과거 같은 사건의 반응. 종목 범위가 있으면 그것, 없으면 시장 범위
 * (사건 창은 크기 구분 없는 `all` 만). 지평 짧은 순 둘까지. 사건 날짜가 줄 맨 앞 — 왜 이 통계인지가 문장에 남는다
 */
export const reactionFacts = (
  eventKind: string,
  occurredAt: Date,
  asset: AgentAsset,
  name: string,
  rows: readonly AgentReactionRow[]
): Omit<AgentToolFact, "id">[] => {
  const label = AGENT_EVENT_LABEL[eventKind];
  if (!label) return [];
  const usable = rows.filter((r) => r.eventKind === eventKind && (r.variant === null || r.variant === "all") && r.sample > 0);
  const own = usable.filter((r) => r.scope === "symbol");
  const picked = (own.length > 0 ? own : usable.filter((r) => r.scope === "market")).sort((a, b) => a.horizon - b.horizon).slice(0, 2);
  const unit = asset === "kr" ? "거래일" : "일";
  return picked.map((r) => ({
    tool: "get_event_reactions" as const,
    news: false,
    text:
      `${mmdd(occurredAt)} ${name} ${label} — 과거 같은 사건 뒤 ` +
      `${r.scope === "symbol" ? "이 종목" : asset === "kr" ? "국내 종목 전체" : "코인 전체"} ` +
      `${r.horizon}${unit} 오른 비율 ${pct(r.upRate)}(표본 ${r.sample}건` +
      `${r.baseUpRate !== null ? ` · 평소 ${pct(r.baseUpRate)}` : ""})`,
    source: { name: `사건 반응 통계(${r.sourceKey})`, url: null, at: r.asOf.toISOString() },
  }));
};

const DOC_SOURCE: Readonly<Record<string, string>> = {
  dart_filing: "DART 공시",
  kr_news_title: "한국투자증권 시황",
  news_article: "코인 뉴스",
  extracted_fact: "기사 본문 사실",
};

/** 문서 — 공시 먼저(뷰가 정렬), 제목 그대로. 날짜는 일어난 날(알게 된 날이 아니다 — 백필한 옛 공시) */
export const documentFacts = (name: string, rows: readonly AgentDocumentRow[]): Omit<AgentToolFact, "id">[] =>
  rows.slice(0, AGENT_LIMITS.linesPerCall).map((r) => ({
    tool: "get_documents" as const,
    news: true,
    text: `${mmdd(r.observedAt)} ${r.predicate === "issued" ? `${name} 공시` : "소식"}: ${r.title.trim()}`,
    source: { name: DOC_SOURCE[r.sourceKind] ?? "소식", url: r.sourceUrl, at: r.observedAt.toISOString() },
  }));

/** 줄에 인용 id 를 붙이고 같은 글은 하나로 · 합 상한 */
export const numberAgentFacts = (facts: readonly Omit<AgentToolFact, "id">[]): AgentToolFact[] => {
  const seen = new Set<string>();
  return facts
    .filter((f) => !seen.has(f.text) && seen.add(f.text))
    .slice(0, AGENT_LIMITS.facts)
    .map((f, i) => ({ ...f, id: `tool-${i + 1}` }));
};
