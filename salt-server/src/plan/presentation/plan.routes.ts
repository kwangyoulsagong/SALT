import { Router } from "express";

import { authMiddleware } from "../../shared/presentation/authMiddleware";
import { rateLimit } from "../../shared/presentation/rateLimit";
import type { PlanUseCases } from "../application/api";
import { PlanController } from "./plan.controller";

/**
 * `plan` 의 HTTP 경로(F003 v2 · `SRV-REQ-021` 개정 2026-11-19). 모두 사람 토큰(`authMiddleware`).
 */
export const createPlanRouter = (useCases: PlanUseCases): Router => {
  const router = Router();
  const controller = new PlanController(useCases);
  router.use(authMiddleware);

  /**
   * @swagger
   * tags:
   *   name: Plan
   *   description: 밸류에이션 밴드 적립 — 이번 주 얼마(BTC · 코스피)
   *
   * components:
   *   schemas:
   *     PlanBandRule:
   *       type: object
   *       properties:
   *         key: { type: string, enum: [extreme_low, low, neutral, high, extreme_high] }
   *         below: { type: number, nullable: true, description: 이 값 미만이면 이 밴드. 끝 줄은 null }
   *         multiplier: { type: number }
   *     PlanSettings:
   *       type: object
   *       properties:
   *         configured: { type: boolean }
   *         monthlyBaseKrw: { type: integer, nullable: true, description: 사용자가 마지막에 넣은 월 적립액 }
   *         currentMonthlyBaseKrw: { type: integer, nullable: true, description: 이번 주에 쓰는 값(수정은 다음 주부터) }
   *         pending:
   *           type: object
   *           nullable: true
   *           properties:
   *             monthlyBaseKrw: { type: integer }
   *             effectiveWeek: { type: string, format: date }
   *         startedWeek: { type: string, format: date, nullable: true }
   *         allocation:
   *           type: array
   *           items:
   *             type: object
   *             properties:
   *               asset: { type: string, enum: [btc, kospi] }
   *               pct: { type: number }
   *               weeklyBaseKrw: { type: integer, nullable: true }
   *               editable: { type: boolean, enum: [false] }
   *         bands:
   *           type: array
   *           items:
   *             type: object
   *             properties:
   *               asset: { type: string, enum: [btc, kospi] }
   *               indicator: { type: string, enum: [mvrv_z, per_percentile], nullable: true }
   *               rules: { type: array, items: { $ref: '#/components/schemas/PlanBandRule' } }
   *               currentBandKey: { type: string, nullable: true }
   *               editable: { type: boolean, enum: [false] }
   *               reasonCode: { type: string, enum: [hit_rate_on_default_band] }
   *         limits:
   *           type: object
   *           properties:
   *             minKrw: { type: integer }
   *             maxKrw: { type: integer }
   *             unitKrw: { type: integer }
   */

  /**
   * @swagger
   * /api/plan/weekly:
   *   get:
   *     summary: 이번 주 적립 계획(F003 v2 · `SRV-REQ-021`)
   *     description: |
   *       자산마다 금액 = 주간 기본액 × 예측 배수(1,000원 단위). 배수 · 지표 · 과거 성적(52주 검산 관문) · 실패 사례 · 김프는
   *       예측 뷰(`forecast.v_accumulation_band`) 그대로 — 관문을 못 지난 자산은 1.0(정액). 3종이 하나라도 없으면
   *       `renderable: false`(에러 아님 · 금액은 그대로). 설정 전이면 `configured: false` 이고 금액은 null.
   *       읽을 때 지난 주를 마감하고(미실행 = skipped) 이번 주 계획을 스냅샷한다(멱등).
   *     tags: [Plan]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: 이번 주 계획
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success: { type: boolean }
   *                 message: { type: string }
   *                 data:
   *                   type: object
   *                   properties:
   *                     weekOf: { type: string, format: date, description: KST 월요일 }
   *                     configured: { type: boolean }
   *                     totalKrw: { type: integer, nullable: true }
   *                     items:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           asset: { type: string, enum: [btc, kospi] }
   *                           indicator: { type: string, enum: [mvrv_z, per_percentile], nullable: true }
   *                           weeklyBaseKrw: { type: integer, nullable: true }
   *                           multiplier: { type: number }
   *                           amountKrw: { type: integer, nullable: true }
   *                           status: { type: string, enum: [planned, executed, skipped], nullable: true }
   *                           executedKrw: { type: integer, nullable: true }
   *                           fixed: { type: boolean, description: false 면 예측 회차 뒤 금액이 바뀔 수 있다 }
   *                           fallback: { type: boolean }
   *                           reasonCode: { type: string, enum: [band_applied, gate_not_passed, band_pending, band_unavailable] }
   *                           basis: { type: object, nullable: true, description: 지표 · 밴드 · 사전등록 밴드 표 · 추정 여부 }
   *                           trackRecord: { type: object, nullable: true, description: 52주 검산 — 초과(배수 가중 − 정액) · 90% 구간 · 연도 }
   *                           failureCases:
   *                             type: object
   *                             nullable: true
   *                             properties:
   *                               count: { type: integer }
   *                               items: { type: array, items: { type: object } }
   *                           renderable: { type: boolean }
   *                           blockedReason: { type: string, nullable: true, enum: [band_missing, indicator_missing, track_record_missing, failure_cases_missing] }
   *                     kimchiPremium:
   *                       type: object
   *                       nullable: true
   *                       properties:
   *                         premiumPct: { type: number }
   *                         costKrwOnPlan: { type: integer, nullable: true }
   *                         level: { type: string, enum: [low, normal, high] }
   *                         asOf: { type: string, format: date-time }
   *                     streak:
   *                       type: object
   *                       properties:
   *                         weeks: { type: integer }
   *                         cumulativeKrw: { type: integer }
   *                         skippedLast12: { type: integer }
   *                         plannedLast12: { type: integer }
   *                     degraded: { type: boolean }
   *                     degradedReasons:
   *                       type: array
   *                       items: { type: string, enum: [band_pending, band_unavailable, kimchi_unavailable] }
   *       401: { description: 인증 실패 }
   */
  router.get("/weekly", controller.getWeekly);

  /**
   * @swagger
   * /api/plan/weekly/complete:
   *   post:
   *     summary: 이번 주 적립 완료 체크(수동 — 원장 매칭 없음)
   *     description: 이번 주만 받는다. 금액을 생략하면 계획액, 다시 보내면 고친다. 상한 = 그 자산 주간 기본액 × 설정값
   *     tags: [Plan]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [weekOf, executions]
   *             properties:
   *               weekOf: { type: string, format: date, description: 이번 주 KST 월요일 }
   *               executions:
   *                 type: array
   *                 minItems: 1
   *                 items:
   *                   type: object
   *                   required: [asset]
   *                   properties:
   *                     asset: { type: string, enum: [btc, kospi] }
   *                     amountKrw: { type: integer, minimum: 0 }
   *     responses:
   *       200:
   *         description: 기록됨
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success: { type: boolean }
   *                 message: { type: string }
   *                 data:
   *                   type: object
   *                   properties:
   *                     weekOf: { type: string, format: date }
   *                     streakWeeks: { type: integer }
   *                     cumulativeKrw: { type: integer }
   *       400: { description: 형식 오류 }
   *       401: { description: 인증 실패 }
   *       422: { description: "PLAN_WEEK_NOT_CURRENT · PLAN_NOT_CONFIGURED · PLAN_EXECUTION_INVALID(asset · min · max)" }
   *       429: { description: 너무 잦은 요청 }
   */
  router.post("/weekly/complete", rateLimit({ windowMs: 60_000, max: 30 }), controller.complete);

  /**
   * @swagger
   * /api/plan/settings:
   *   get:
   *     summary: 적립 설정 — 월 적립액 · 배분 · 밴드 표(읽기 전용)
   *     description: 설정 전이면 200 `configured false`
   *     tags: [Plan]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: 설정
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success: { type: boolean }
   *                 message: { type: string }
   *                 data: { $ref: '#/components/schemas/PlanSettings' }
   *       401: { description: 인증 실패 }
   *   patch:
   *     summary: 월 적립액 저장(첫 저장 · 수정 같은 경로)
   *     description: |
   *       첫 저장은 이번 주 계획을 바로 만든다. 수정은 다음 주부터 반영(이번 주 금액은 그대로).
   *       밴드 · 배분 키(`bandConfig` · `bands` · `thresholds` · `multipliers` · `multiplier` · `allocation`)가 오면 422 `PLAN_BAND_READ_ONLY`.
   *     tags: [Plan]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [monthlyBaseKrw]
   *             properties:
   *               monthlyBaseKrw: { type: integer, description: 1,000원 단위 · 설정 하한 이상 상한 이하 }
   *     responses:
   *       200:
   *         description: 저장 뒤 설정
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success: { type: boolean }
   *                 message: { type: string }
   *                 data: { $ref: '#/components/schemas/PlanSettings' }
   *       400: { description: 형식 오류 }
   *       401: { description: 인증 실패 }
   *       422: { description: "PLAN_BASE_AMOUNT_INVALID(field · min · max · unit) · PLAN_BAND_READ_ONLY(field)" }
   *       429: { description: 너무 잦은 요청 }
   */
  router.get("/settings", controller.getSettings);
  router.patch("/settings", rateLimit({ windowMs: 60_000, max: 30 }), controller.updateSettings);

  /**
   * @swagger
   * /api/plan/monthly-summary:
   *   get:
   *     summary: 이번 달 적립 합계 — 귀속 달은 주의 KST 월요일 달
   *     tags: [Plan]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: month
   *         required: false
   *         schema: { type: string, pattern: '^\d{4}-(0[1-9]|1[0-2])$' }
   *         description: 생략하면 이번 달(KST). 오지 않은 달은 400 `PLAN_MONTH_IN_FUTURE`(`currentMonth` 를 같이 준다)
   *     responses:
   *       200:
   *         description: 합계
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success: { type: boolean }
   *                 message: { type: string }
   *                 data:
   *                   type: object
   *                   properties:
   *                     month: { type: string }
   *                     executedKrw: { type: integer }
   *                     plannedKrw: { type: integer }
   *                     monthlyBaseKrw: { type: integer, nullable: true }
   *                     progressPct: { type: number, nullable: true }
   *                     executedWeeks: { type: integer }
   *                     totalWeeks: { type: integer }
   *                     daysLeft: { type: integer }
   *       400: { description: "형식 오류 · 오지 않은 달(PLAN_MONTH_IN_FUTURE)" }
   *       401: { description: 인증 실패 }
   */
  router.get("/monthly-summary", controller.getMonthlySummary);

  return router;
};
