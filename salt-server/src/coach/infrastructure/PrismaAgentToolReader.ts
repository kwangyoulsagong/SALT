import prisma from "../../shared/infrastructure/prisma";
import {
  AGENT_EVENT_LABEL,
  type AgentDocumentRow,
  type AgentForecastCardRow,
  type AgentNeighborRow,
  type AgentReactionRow,
  type AgentRecentEvent,
  type AgentToolReader,
} from "../domain";

/**
 * 에이전트 도구 계약 읽기(O3 · `SRV-REQ-059` · `DB-REQ-045`) — 서버는 `forecast` 를 **뷰 · 함수로만** 읽는다(salt-forecast `db-contract.md` §2).
 * 숫자를 다시 계산하지 않는다(로그수익률 → % 같은 표시 변환은 도메인 `agentTools`). 호출 하나 = 문장 하나, 행 상한은 SQL 에
 */
const forecastKey = (symbol: string, asset: "kr" | "crypto") => (asset === "crypto" ? `KRW-${symbol}` : symbol);

export class PrismaAgentToolReader implements AgentToolReader {
  async forecastCards(symbol: string, asset: "kr" | "crypto", asOf: Date): Promise<AgentForecastCardRow[]> {
    const rows = await prisma.$queryRaw<
      Array<{
        horizon_weeks: number;
        p_up: number;
        q05: number;
        q95: number;
        sample: number;
        direction_calls: number | null;
        direction_hits: number | null;
        always_up_rate: number | null;
        miss_count: number | null;
        model_version: string;
        as_of: Date;
      }>
    >`
      SELECT horizon_weeks, p_up, q05, q95, sample, direction_calls, direction_hits, always_up_rate, miss_count, model_version, as_of
      FROM forecast.v_forecast_card
      WHERE symbol = ${forecastKey(symbol, asset)} AND renderable AND as_of <= ${asOf}
      ORDER BY horizon_weeks LIMIT 4`;
    return rows.map((r) => ({
      horizonWeeks: Number(r.horizon_weeks),
      pUp: r.p_up,
      q05: r.q05,
      q95: r.q95,
      sample: Number(r.sample),
      directionCalls: Number(r.direction_calls ?? 0),
      directionHits: Number(r.direction_hits ?? 0),
      alwaysUpRate: r.always_up_rate,
      missCount: r.miss_count === null ? null : Number(r.miss_count),
      modelVersion: r.model_version,
      asOf: r.as_of,
    }));
  }

  async neighbors(entity: string, depth: number, asOf: Date): Promise<AgentNeighborRow[]> {
    const rows = await prisma.$queryRaw<
      Array<{
        entity: string;
        kind: string;
        name: string;
        hop: number;
        via_predicate: string;
        shared_documents: number;
        source_kind: string;
        available_at: Date;
      }>
    >`
      SELECT entity, kind, name, hop, via_predicate, shared_documents, source_kind, available_at
      FROM forecast.f_agent_neighbors(${entity}, ${depth}::int, ${asOf})
      ORDER BY shared_documents DESC, hop, entity LIMIT 40`;
    return rows.map((r) => ({
      entity: r.entity,
      kind: r.kind,
      name: r.name,
      hop: Number(r.hop),
      viaPredicate: r.via_predicate,
      sharedDocuments: Number(r.shared_documents),
      sourceKind: r.source_kind,
      availableAt: r.available_at,
    }));
  }

  async eventKinds(symbol: string, asset: "kr" | "crypto"): Promise<string[]> {
    const rows = await prisma.$queryRaw<Array<{ event_kind: string }>>`
      SELECT DISTINCT event_kind FROM forecast.v_agent_event_reactions
      WHERE (scope = 'symbol' AND scope_key = ${forecastKey(symbol, asset)}) OR (scope = 'market' AND scope_key = ${asset})
      ORDER BY event_kind`;
    // 이름 없는 종류는 메뉴에 올리지 않는다(영문 코드를 문장에 흘리지 않는다)
    return rows.map((r) => r.event_kind).filter((k) => AGENT_EVENT_LABEL[k] !== undefined);
  }

  async recentEvents(entity: string, since: Date, asOf: Date): Promise<AgentRecentEvent[]> {
    const rows = await prisma.$queryRaw<Array<{ event_kind: string; observed_at: Date }>>`
      SELECT event_kind, observed_at FROM forecast.f_agent_recent_events(${entity}, ${since}, ${asOf})`;
    return rows.map((r) => ({ kind: r.event_kind, observedAt: r.observed_at }));
  }

  async eventReactions(eventKind: string, symbol: string, asset: "kr" | "crypto"): Promise<AgentReactionRow[]> {
    const rows = await prisma.$queryRaw<
      Array<{
        family: AgentReactionRow["family"];
        event_kind: string;
        scope: "market" | "symbol";
        scope_key: string;
        variant: string | null;
        horizon: number;
        sample: number;
        up_rate: number;
        base_up_rate: number | null;
        source_key: string;
        as_of: Date;
      }>
    >`
      SELECT family, event_kind, scope, scope_key, variant, horizon, sample, up_rate, base_up_rate, source_key, as_of
      FROM forecast.v_agent_event_reactions
      WHERE event_kind = ${eventKind}
        AND ((scope = 'symbol' AND scope_key = ${forecastKey(symbol, asset)}) OR (scope = 'market' AND scope_key = ${asset}))
      ORDER BY scope DESC, horizon LIMIT 12`;
    return rows.map((r) => ({
      family: r.family,
      eventKind: r.event_kind,
      scope: r.scope,
      scopeKey: r.scope_key,
      variant: r.variant,
      horizon: Number(r.horizon),
      sample: Number(r.sample),
      upRate: r.up_rate,
      baseUpRate: r.base_up_rate,
      sourceKey: r.source_key,
      asOf: r.as_of,
    }));
  }

  async documents(entity: string, since: Date, asOf: Date, limit: number): Promise<AgentDocumentRow[]> {
    const rows = await prisma.$queryRaw<
      Array<{
        document: string;
        title: string;
        predicate: string;
        source_kind: string;
        observed_at: Date;
        available_at: Date;
        source_url: string | null;
      }>
    >`
      SELECT document, title, predicate, source_kind, observed_at, available_at, source_url
      FROM forecast.f_agent_documents(${entity}, ${since}, ${asOf}, ${limit}::int)`;
    return rows.map((r) => ({
      document: r.document,
      title: r.title,
      predicate: r.predicate,
      sourceKind: r.source_kind,
      observedAt: r.observed_at,
      availableAt: r.available_at,
      sourceUrl: r.source_url,
    }));
  }
}
