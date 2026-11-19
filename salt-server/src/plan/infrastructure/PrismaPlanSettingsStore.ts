import { randomUUID } from "node:crypto";

import prisma from "../../shared/infrastructure/prisma";
import type { PlanSettingsRecord, PlanSettingsStore } from "../domain";

const isoDate = (d: Date): string => d.toISOString().slice(0, 10);

/**
 * `plan_settings` — 사람마다 한 행. 저장은 한 문장 `INSERT … ON CONFLICT (user_id) DO UPDATE`(첫 저장 경합에 유니크 위반 0 —
 * `prisma-database.md`). 이전 값 · 반영 주 계산은 유스케이스가 잠금 안에서 한다.
 */
export class PrismaPlanSettingsStore implements PlanSettingsStore {
  async get(userId: string): Promise<PlanSettingsRecord | null> {
    const row = await prisma.planSettings.findUnique({
      where: { userId },
      select: { monthlyBaseKrw: true, previousMonthlyBaseKrw: true, effectiveWeek: true, startedWeek: true },
    });
    if (!row) return null;
    return {
      monthlyBaseKrw: row.monthlyBaseKrw.toNumber(),
      previousMonthlyBaseKrw: row.previousMonthlyBaseKrw?.toNumber() ?? null,
      effectiveWeek: isoDate(row.effectiveWeek),
      startedWeek: isoDate(row.startedWeek),
    };
  }

  async lock(userId: string): Promise<void> {
    await prisma.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`plan:settings:${userId}`}))`;
  }

  async save(userId: string, r: PlanSettingsRecord): Promise<void> {
    await prisma.$executeRaw`
      INSERT INTO plan_settings (id, user_id, monthly_base_krw, previous_monthly_base_krw, effective_week, started_week, updated_at)
      VALUES (${randomUUID()}, ${userId}, ${r.monthlyBaseKrw}::numeric, ${r.previousMonthlyBaseKrw}::numeric,
              ${r.effectiveWeek}::date, ${r.startedWeek}::date, now())
      ON CONFLICT (user_id) DO UPDATE SET
        monthly_base_krw = EXCLUDED.monthly_base_krw,
        previous_monthly_base_krw = EXCLUDED.previous_monthly_base_krw,
        effective_week = EXCLUDED.effective_week,
        updated_at = now()`;
  }
}
