import { randomUUID } from "node:crypto";

import { Prisma } from "@prisma/client";

import prisma from "../../shared/infrastructure/prisma";
import type { ExecutionRecord, ExecutionStore, PlanAsset } from "../domain";

const isoDate = (d: Date): string => d.toISOString().slice(0, 10);

/**
 * `weekly_plan_executions` — 쓰기는 전부 한 문장(행마다 `Promise.all` 로 흩지 않는다 — `noParallelRowWrites`).
 * 넣기는 `ON CONFLICT DO NOTHING` — 처음 만든 스냅샷을 지킨다(동시 첫 요청도 오류 0).
 */
export class PrismaExecutionStore implements ExecutionStore {
  async list(userId: string, fromWeek: string, toWeek: string): Promise<ExecutionRecord[]> {
    const rows = await prisma.weeklyPlanExecution.findMany({
      where: { userId, weekOf: { gte: new Date(`${fromWeek}T00:00:00Z`), lte: new Date(`${toWeek}T00:00:00Z`) } },
      orderBy: [{ weekOf: "asc" }, { asset: "asc" }],
      // 한 사람 주 × 자산 — 10년이면 1,040행. 상한은 그 위로
      take: 2_000,
      select: {
        weekOf: true,
        asset: true,
        weeklyBaseKrw: true,
        multiplier: true,
        plannedKrw: true,
        bandKey: true,
        gatePassed: true,
        blockedReason: true,
        preregKey: true,
        indicatorValue: true,
        fallback: true,
        status: true,
        executedKrw: true,
        recordedAt: true,
      },
    });
    return rows.map((r) => ({
      weekOf: isoDate(r.weekOf),
      asset: r.asset as PlanAsset, // DB CHECK (btc · kospi)
      weeklyBaseKrw: r.weeklyBaseKrw.toNumber(),
      multiplier: r.multiplier.toNumber(),
      plannedKrw: r.plannedKrw.toNumber(),
      bandKey: r.bandKey,
      gatePassed: r.gatePassed,
      blockedReason: r.blockedReason,
      preregKey: r.preregKey,
      indicatorValue: r.indicatorValue,
      fallback: r.fallback,
      status: r.status as ExecutionRecord["status"], // DB CHECK
      executedKrw: r.executedKrw?.toNumber() ?? null,
      recordedAt: r.recordedAt,
    }));
  }

  async insertMissing(userId: string, rows: readonly ExecutionRecord[]): Promise<void> {
    if (rows.length === 0) return;
    const values = rows.map(
      (r) => Prisma.sql`(${randomUUID()}, ${userId}, ${r.weekOf}::date, ${r.asset}, ${r.weeklyBaseKrw}::numeric, ${r.multiplier}::numeric,
        ${r.plannedKrw}::numeric, ${r.bandKey}, ${r.gatePassed}, ${r.blockedReason}, ${r.preregKey}, ${r.indicatorValue}::float8,
        ${r.fallback}, ${r.status}, now())`
    );
    await prisma.$executeRaw`
      INSERT INTO weekly_plan_executions (id, user_id, week_of, asset, weekly_base_krw, multiplier, planned_krw, band_key, gate_passed,
                                          blocked_reason, prereg_key, indicator_value, fallback, status, updated_at)
      VALUES ${Prisma.join(values)}
      ON CONFLICT (user_id, week_of, asset) DO NOTHING`;
  }

  async closeBefore(userId: string, beforeWeek: string): Promise<void> {
    await prisma.$executeRaw`
      UPDATE weekly_plan_executions SET status = 'skipped', updated_at = now()
      WHERE user_id = ${userId} AND status = 'planned' AND week_of < ${beforeWeek}::date`;
  }

  async markExecuted(
    userId: string,
    weekOf: string,
    items: ReadonlyArray<{ asset: PlanAsset; executedKrw: number }>,
    at: Date
  ): Promise<void> {
    if (items.length === 0) return;
    const values = items.map((i) => Prisma.sql`(${i.asset}, ${i.executedKrw}::numeric)`);
    await prisma.$executeRaw`
      UPDATE weekly_plan_executions AS e
      SET status = 'executed', executed_krw = v.amount, recorded_at = ${at}, updated_at = now()
      FROM (VALUES ${Prisma.join(values)}) AS v(asset, amount)
      WHERE e.user_id = ${userId} AND e.week_of = ${weekOf}::date AND e.asset = v.asset`;
  }
}
