import type { Prisma } from "@prisma/client";

import prisma from "../../shared/infrastructure/prisma";
import type {
  CoachInsight,
  CoachInsightDraft,
  CoachInsightStore,
} from "../domain";

/**
 * 인사이트 저장·조회.
 *
 * ## 이 테이블은 아직 주인이 둘이다
 *
 * `ai_coach` · `behavior_analysis` 는 코치가 쓰고, `smart_buy_zone` · `risk_alert` 는
 * **아직 `modules/investment-insight` 의 워커**가 쓴다(FR-33 · `SRV-REQ-007`).
 * 코치는 남의 타입을 **읽기만** 하고 쓰지 않는다 — 그 경계를 이 파일의 메서드
 * 이름이 드러낸다(`saveRecommendation` · `saveBehavior` 만 쓰기다).
 *
 * 그 둘이 이관되면 이 Store 는 자기 타입만 남고, 남의 타입 읽기는 그때
 * 공개 API 나 이벤트로 바뀐다.
 */

type InsightRow = {
  id: string;
  type: string;
  symbol: string | null;
  dedupeKey: string | null;
  title: string;
  summary: string;
  severity: number;
  confidence: number | null;
  payload: Prisma.JsonValue | null;
  createdAt: Date;
  expiresAt: Date | null;
};

const toDomain = (row: InsightRow): CoachInsight => ({
  id: row.id,
  type: row.type,
  symbol: row.symbol,
  dedupeKey: row.dedupeKey,
  title: row.title,
  summary: row.summary,
  severity: row.severity,
  confidence: row.confidence,
  // Prisma 의 `Json` 은 배열·스칼라도 될 수 있다. 객체가 아니면 `null` 로 본다 —
  // 도메인은 "이름으로 꺼내는 맵"만 기대한다.
  payload:
    row.payload && typeof row.payload === "object" && !Array.isArray(row.payload)
      ? (row.payload as Record<string, unknown>)
      : null,
  createdAt: row.createdAt,
  expiresAt: row.expiresAt,
});

const toJson = (payload: Record<string, unknown>): Prisma.InputJsonValue =>
  payload as Prisma.InputJsonValue;

export class PrismaCoachInsightStore implements CoachInsightStore {
  /**
   * 점수 계산 재료.
   *
   * `global` 을 함께 읽는다 — 시장 전체에 걸린 신호(고래·매수 구간)는 사용자마다
   * 만들지 않고 한 벌만 쓴다. 만료된 것은 처음부터 읽지 않는다.
   */
  async findActiveForScoring(
    userId: string,
    limit: number
  ): Promise<CoachInsight[]> {
    const rows = await prisma.investmentInsight.findMany({
      where: {
        OR: [{ userId }, { userId: "global" }],
        AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }],
      },
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
      take: limit,
    });

    return rows.map(toDomain);
  }

  async findLatestRecommendation(userId: string): Promise<CoachInsight | null> {
    const row = await prisma.investmentInsight.findFirst({
      where: { userId, type: "ai_coach" },
      orderBy: { createdAt: "desc" },
    });

    return row ? toDomain(row) : null;
  }

  async findRecommendationByKey(
    userId: string,
    dedupeKey: string
  ): Promise<CoachInsight | null> {
    const row = await prisma.investmentInsight.findUnique({
      where: {
        userId_type_dedupeKey: { userId, type: "ai_coach", dedupeKey },
      },
    });

    return row ? toDomain(row) : null;
  }

  async saveRecommendation(draft: CoachInsightDraft): Promise<CoachInsight> {
    const row = await prisma.investmentInsight.upsert({
      where: {
        userId_type_dedupeKey: {
          userId: draft.userId,
          type: "ai_coach",
          dedupeKey: draft.dedupeKey,
        },
      },
      create: {
        userId: draft.userId,
        type: "ai_coach",
        title: draft.title,
        summary: draft.summary,
        severity: draft.severity,
        confidence: draft.confidence,
        dedupeKey: draft.dedupeKey,
        payload: toJson(draft.payload),
        expiresAt: draft.expiresAt,
      },
      update: {
        summary: draft.summary,
        severity: draft.severity,
        confidence: draft.confidence,
        payload: toJson(draft.payload),
        expiresAt: draft.expiresAt,
      },
    });

    return toDomain(row);
  }

  /**
   * 피드백은 **행을 덮지 않고 쌓는다.** 판단이 아니라 기록이라 `dedupeKey` 가
   * 매번 다르다 — 같은 종목에 대한 피드백 두 건은 서로를 지우지 않아야 한다.
   */
  async saveFeedback(draft: CoachInsightDraft): Promise<CoachInsight> {
    const row = await prisma.investmentInsight.create({
      data: {
        userId: draft.userId,
        symbol: draft.symbol ?? null,
        assetType: "crypto",
        type: "ai_coach",
        title: draft.title,
        summary: draft.summary,
        severity: draft.severity,
        confidence: draft.confidence,
        dedupeKey: draft.dedupeKey,
        payload: toJson(draft.payload),
        expiresAt: draft.expiresAt,
      },
    });

    return toDomain(row);
  }

  async saveBehavior(draft: CoachInsightDraft): Promise<CoachInsight> {
    const row = await prisma.investmentInsight.upsert({
      where: {
        userId_type_dedupeKey: {
          userId: draft.userId,
          type: "behavior_analysis",
          dedupeKey: draft.dedupeKey,
        },
      },
      create: {
        userId: draft.userId,
        type: "behavior_analysis",
        title: draft.title,
        summary: draft.summary,
        severity: draft.severity,
        confidence: draft.confidence,
        dedupeKey: draft.dedupeKey,
        payload: toJson(draft.payload),
        expiresAt: draft.expiresAt,
      },
      update: {
        title: draft.title,
        summary: draft.summary,
        severity: draft.severity,
        confidence: draft.confidence,
        payload: toJson(draft.payload),
        expiresAt: draft.expiresAt,
      },
    });

    return toDomain(row);
  }

  async findActiveBehavior(
    userId: string,
    limit: number
  ): Promise<CoachInsight[]> {
    const rows = await prisma.investmentInsight.findMany({
      where: {
        userId,
        type: "behavior_analysis",
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
      take: limit,
    });

    return rows.map(toDomain);
  }

  async findRecommendationHistory(
    userId: string,
    symbol: string | undefined,
    limit: number
  ): Promise<CoachInsight[]> {
    const rows = await prisma.investmentInsight.findMany({
      where: {
        userId,
        type: "ai_coach",
        ...(symbol ? { symbol: symbol.toUpperCase() } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return rows.map(toDomain);
  }
}
