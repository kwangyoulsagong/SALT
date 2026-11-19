import { z } from "zod";

import { PLAN_ASSETS } from "../../domain";

/** 월 적립액 저장 — 형식만(정수). 단위 · 하한 · 상한은 도메인(422 `PLAN_BASE_AMOUNT_INVALID` + min · max) */
export const updatePlanSettingsSchema = z.object({ monthlyBaseKrw: z.number().int() }).strict();

export const completeWeeklyPlanSchema = z
  .object({
    weekOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    executions: z
      .array(z.object({ asset: z.enum(PLAN_ASSETS), amountKrw: z.number().int().optional() }).strict())
      .min(1)
      .max(PLAN_ASSETS.length)
      .refine((xs) => new Set(xs.map((x) => x.asset)).size === xs.length, { message: "자산이 겹친다" }),
  })
  .strict();

export const monthlySummaryQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
    .optional(),
});

export type UpdatePlanSettingsDto = z.infer<typeof updatePlanSettingsSchema>;
export type CompleteWeeklyPlanDto = z.infer<typeof completeWeeklyPlanSchema>;
