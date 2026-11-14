import prisma from "../../shared/infrastructure/prisma";
import { AI_EXTRACT_MAX_ATTEMPTS, type AiBodyForExtraction, type AiBodyVia, isAiReadable } from "../domain";
import type {
  AiBodyDue,
  AiBodyLink,
  AiBodyStatus,
  AiBodyStore,
  AiSourceStore,
  OutletRow,
  RobotsSnapshot,
  RssItem,
} from "../domain";

/** 공시 원천 이름(화면 출처 칩) */
const DART_SOURCE_NAME = "DART 공시";

const STATUSES: readonly AiBodyStatus[] = ["pending", "ok", "empty", "failed", "unmatched", "blocked", "no_outlet", "robots_blocked"];

/**
 * AI 경로 본문 저장(`SRV-REQ-058`) — 쓰기는 모두 한 문장(`unnest` · `ON CONFLICT`). 오류 코드로 흐름을 가르지 않는다.
 * 트랜잭션을 열지 않는다(`ddd-infrastructure.md` §7)
 */
export class PrismaAiSourceStore implements AiSourceStore {
  async syncOutlets(rows: OutletRow[], at: Date) {
    if (rows.length === 0) return;
    const col = <T,>(pick: (r: OutletRow) => T) => rows.map(pick);
    await prisma.$executeRaw`
      INSERT INTO news_outlet (id, name, market, enabled, robots_verdict, terms_verdict, terms_note, checked_at)
      SELECT u.id, u.name, u.market, u.enabled, u.robots_verdict, u.terms_verdict, u.terms_note, ${at}
      FROM unnest(${col((r) => r.id)}::text[], ${col((r) => r.name)}::text[], ${col((r) => r.market)}::text[],
        ${col((r) => r.enabled)}::boolean[], ${col((r) => r.robotsVerdict)}::text[], ${col((r) => r.termsVerdict)}::text[],
        ${col((r) => r.termsNote)}::text[]) AS u(id, name, market, enabled, robots_verdict, terms_verdict, terms_note)
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, market = EXCLUDED.market, enabled = EXCLUDED.enabled,
        robots_verdict = EXCLUDED.robots_verdict, terms_verdict = EXCLUDED.terms_verdict, terms_note = EXCLUDED.terms_note,
        checked_at = EXCLUDED.checked_at`;
    // 목록에서 빠진 매체는 끈다(지우지 않는다 — 옛 본문 행이 이름을 가리킨다)
    await prisma.$executeRaw`UPDATE news_outlet SET enabled = false, checked_at = ${at} WHERE enabled AND NOT (id = ANY(${col((r) => r.id)}::text[]))`;
  }

  async enabledOutletIds() {
    const rows = await prisma.newsOutlet.findMany({ where: { enabled: true }, select: { id: true } });
    return new Set(rows.map((r) => r.id));
  }

  async robots(origin: string) {
    const row = await prisma.newsRobots.findUnique({ where: { origin } });
    return row ? { snapshot: { status: row.status, body: row.body }, fetchedAt: row.fetchedAt } : null;
  }

  async saveRobots(origin: string, snapshot: RobotsSnapshot, at: Date) {
    await prisma.$executeRaw`
      INSERT INTO news_robots (origin, status, body, fetched_at) VALUES (${origin}, ${snapshot.status}, ${snapshot.body.slice(0, 200_000)}, ${at})
      ON CONFLICT (origin) DO UPDATE SET status = EXCLUDED.status, body = EXCLUDED.body, fetched_at = EXCLUDED.fetched_at`;
  }

  async feedState(url: string) {
    const row = await prisma.newsFeedState.findUnique({ where: { url }, select: { etag: true, lastModified: true } });
    return row ? { etag: row.etag, lastModified: row.lastModified } : null;
  }

  /** 304 면 검증자를 그대로 둔다(`COALESCE`) — 다음 요청도 같은 검증자로 묻는다 */
  async saveFeedState(url: string, outletId: string, state: { etag: string | null; lastModified: string | null; status: string }, at: Date) {
    await prisma.$executeRaw`
      INSERT INTO news_feed_state (url, outlet_id, etag, last_modified, status, polled_at)
      VALUES (${url}, ${outletId}, ${state.etag}, ${state.lastModified}, ${state.status}, ${at})
      ON CONFLICT (url) DO UPDATE SET outlet_id = EXCLUDED.outlet_id, status = EXCLUDED.status, polled_at = EXCLUDED.polled_at,
        etag = COALESCE(EXCLUDED.etag, news_feed_state.etag), last_modified = COALESCE(EXCLUDED.last_modified, news_feed_state.last_modified)`;
  }

  async saveItems(items: RssItem[], at: Date) {
    const unique = [...new Map(items.map((i) => [i.url, i])).values()];
    if (unique.length === 0) return 0;
    return prisma.$executeRaw`
      INSERT INTO news_rss_item (url, outlet_id, title, published_at, fetched_at)
      SELECT u.url, u.outlet_id, u.title, u.published_at, ${at}
      FROM unnest(${unique.map((i) => i.url)}::text[], ${unique.map((i) => i.outletId)}::text[], ${unique.map((i) => i.title)}::text[],
        ${unique.map((i) => i.publishedAt)}::timestamptz[]) AS u(url, outlet_id, title, published_at)
      ON CONFLICT (url) DO NOTHING`;
  }

  async recentItems(outletIds: string[], since: Date) {
    if (outletIds.length === 0) return [];
    const rows = await prisma.newsRssItem.findMany({
      where: { outletId: { in: outletIds }, publishedAt: { gte: since } },
      select: { url: true, outletId: true, title: true, publishedAt: true },
      take: 20_000,
    });
    return rows;
  }

  async pruneItems(before: Date) {
    return prisma.$executeRaw`DELETE FROM news_rss_item WHERE published_at < ${before}`;
  }
}

export class PrismaAiBodyStore implements AiBodyStore {
  async statuses(keys: string[]) {
    if (keys.length === 0) return new Map<string, AiBodyStatus>();
    const rows = await prisma.newsAiBody.findMany({ where: { key: { in: keys } }, select: { key: true, status: true } });
    return new Map(rows.filter((r) => STATUSES.includes(r.status as AiBodyStatus)).map((r) => [r.key, r.status as AiBodyStatus]));
  }

  /** 다시 볼 상태(`unmatched` · `blocked`)만 덮는다 — 받기 시작한 행 · 끝난 행은 그대로 */
  async saveLinks(links: AiBodyLink[], at: Date) {
    const unique = [...new Map(links.map((l) => [l.key, l])).values()];
    if (unique.length === 0) return;
    const col = <T,>(pick: (l: AiBodyLink) => T) => unique.map(pick);
    await prisma.$executeRaw`
      INSERT INTO news_ai_body (key, market, title, title_published_at, outlet_id, via, status, item_url, next_try_at, linked_at, symbols)
      SELECT u.key, u.market, u.title, u.published_at, u.outlet_id, u.via, u.status, u.item_url,
        CASE WHEN u.status = 'pending' THEN ${at}::timestamptz END, ${at},
        COALESCE(string_to_array(NULLIF(u.symbols, ''), ','), '{}')
      FROM unnest(${col((l) => l.key)}::text[], ${col((l) => l.market)}::text[], ${col((l) => l.title)}::text[],
        ${col((l) => l.titlePublishedAt)}::timestamptz[], ${col((l) => l.outletId)}::text[], ${col((l) => l.via)}::text[],
        ${col((l) => l.status)}::text[], ${col((l) => l.itemUrl)}::text[], ${col((l) => l.symbols.join(","))}::text[])
        AS u(key, market, title, published_at, outlet_id, via, status, item_url, symbols)
      ON CONFLICT (key) DO UPDATE SET outlet_id = EXCLUDED.outlet_id, via = EXCLUDED.via, status = EXCLUDED.status,
        item_url = EXCLUDED.item_url, next_try_at = EXCLUDED.next_try_at, linked_at = EXCLUDED.linked_at, symbols = EXCLUDED.symbols
      WHERE news_ai_body.status IN ('unmatched', 'blocked')
        AND (news_ai_body.status, news_ai_body.item_url, news_ai_body.symbols)
          IS DISTINCT FROM (EXCLUDED.status, EXCLUDED.item_url, EXCLUDED.symbols)`;
  }

  async dueForFetch(limit: number, now: Date): Promise<AiBodyDue[]> {
    const rows = await prisma.$queryRaw<Array<{ key: string; outlet_id: string; item_url: string; title: string; attempts: number }>>`
      SELECT key, outlet_id, item_url, title, attempts
      FROM news_ai_body
      WHERE status IN ('pending', 'failed') AND next_try_at <= ${now} AND item_url IS NOT NULL AND outlet_id IS NOT NULL
      ORDER BY next_try_at ASC
      LIMIT ${limit}`;
    return rows.map((r) => ({ key: r.key, outletId: r.outlet_id, itemUrl: r.item_url, title: r.title, attempts: r.attempts }));
  }

  async saveFetched(key: string, result: Parameters<AiBodyStore["saveFetched"]>[1], at: Date) {
    if (result.status === "ok") {
      await prisma.$executeRaw`
        UPDATE news_ai_body SET status = 'ok', paragraphs = ${JSON.stringify(result.paragraphs)}::jsonb, body_hash = ${result.hash},
          body_chars = ${result.chars}, fetched_at = ${at}, next_try_at = NULL
        WHERE key = ${key}`;
      return;
    }
    if (result.status === "failed") {
      // 3회를 넘으면 다시 받을 시각이 없다 — 상태는 failed 로 끝
      await prisma.$executeRaw`
        UPDATE news_ai_body SET status = 'failed', attempts = ${result.attempts}, next_try_at = ${result.nextTryAt}, fetched_at = ${at}
        WHERE key = ${key}`;
      return;
    }
    await prisma.$executeRaw`UPDATE news_ai_body SET status = ${result.status}, fetched_at = ${at}, next_try_at = NULL WHERE key = ${key}`;
  }

  async pendingExtraction(limit: number): Promise<AiBodyForExtraction[]> {
    const rows = await prisma.$queryRaw<
      Array<{ key: string; market: string; title: string; title_published_at: Date; fetched_at: Date; symbols: string[];
        item_url: string; outlet_name: string | null; via: string; paragraphs: unknown; extract_attempts: number }>
    >`
      SELECT b.key, b.market, b.title, b.title_published_at, b.fetched_at, b.symbols, b.item_url,
        COALESCE(o.name, CASE WHEN b.via = 'dart' THEN ${DART_SOURCE_NAME} END) AS outlet_name, b.via,
        b.paragraphs, b.extract_attempts
      FROM news_ai_body b LEFT JOIN news_outlet o ON o.id = b.outlet_id
      WHERE b.status = 'ok' AND b.extracted_at IS NULL AND b.purged_at IS NULL AND b.via <> 'portal'
        AND b.extract_attempts < ${AI_EXTRACT_MAX_ATTEMPTS} AND b.item_url IS NOT NULL AND cardinality(b.symbols) > 0
      ORDER BY b.fetched_at ASC
      LIMIT ${limit}`;
    // 두 번 거른다 — SQL(`via <> 'portal'`)과 도메인 허용 목록. 모르는 via 값이 들어와도 AI 로 가지 않는다
    return rows
      .filter((r) => isAiReadable(r.via) && (r.market === "kr" || r.market === "coin"))
      .map((r) => ({
        key: r.key,
        market: r.market as "kr" | "coin",
        title: r.title,
        publishedAt: r.title_published_at,
        fetchedAt: r.fetched_at,
        symbols: r.symbols,
        url: r.item_url,
        outletName: r.outlet_name ?? "",
        via: r.via as AiBodyVia,
        paragraphs: Array.isArray(r.paragraphs) ? r.paragraphs.filter((p): p is string => typeof p === "string") : [],
        attempts: r.extract_attempts,
      }));
  }

  async markExtraction(key: string, outcome: "done" | "failed", at: Date) {
    if (outcome === "done") {
      await prisma.$executeRaw`UPDATE news_ai_body SET extracted_at = ${at} WHERE key = ${key} AND extracted_at IS NULL`;
      return;
    }
    // 실패 — 상한에 닿으면 끝으로 친다(같은 본문을 하루 종일 다시 보내지 않는다)
    await prisma.$executeRaw`
      UPDATE news_ai_body SET extract_attempts = extract_attempts + 1,
        extracted_at = CASE WHEN extract_attempts + 1 >= ${AI_EXTRACT_MAX_ATTEMPTS} THEN ${at}::timestamptz ELSE NULL END
      WHERE key = ${key} AND extracted_at IS NULL`;
  }

  async saveDisclosures(rows: Parameters<AiBodyStore["saveDisclosures"]>[0], at: Date) {
    if (rows.length === 0) return 0;
    const col = <T,>(pick: (r: (typeof rows)[number]) => T) => rows.map(pick);
    return prisma.$executeRaw`
      INSERT INTO news_ai_body (key, market, title, title_published_at, outlet_id, via, status, item_url, paragraphs, body_hash, body_chars,
        linked_at, fetched_at, symbols)
      SELECT u.key, 'kr', u.title, u.published_at, NULL, 'dart', 'ok', u.url, u.paragraphs::jsonb, u.hash, u.chars, ${at}, ${at},
        string_to_array(u.symbols, ',')
      FROM unnest(${col((r) => r.key)}::text[], ${col((r) => r.title)}::text[], ${col((r) => r.publishedAt)}::timestamptz[],
        ${col((r) => r.url)}::text[], ${col((r) => JSON.stringify(r.paragraphs))}::text[], ${col((r) => r.hash)}::text[],
        ${col((r) => r.chars)}::int[], ${col((r) => r.symbols.join(","))}::text[])
        AS u(key, title, published_at, url, paragraphs, hash, chars, symbols)
      ON CONFLICT (key) DO NOTHING`;
  }

  async purgeParagraphs(before: Date, at: Date) {
    return prisma.$executeRaw`
      UPDATE news_ai_body SET paragraphs = '[]'::jsonb, purged_at = ${at}
      WHERE status = 'ok' AND purged_at IS NULL AND (extracted_at IS NOT NULL OR fetched_at < ${before})`;
  }
}
