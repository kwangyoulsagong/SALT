import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { appCoachController } from "../controllers/coach.controller";
import { appTradeRiskController } from "../controllers/trade-risk.controller";
import { appBehaviorMirrorController } from "../controllers/behavior-mirror.controller";
import { appJudgmentScoreboardController } from "../controllers/judgment-scoreboard.controller";
import { appTargetWeightController } from "../controllers/target-weight.controller";

/**
 * 코치 리포트 — `/api/app/coach/*` (`BFF-REQ-023` "조립 — 코치 리포트").
 * 종목 판단(`/api/app/ai-coach/detail`)과 다른 화면이다.
 */
const router = Router();

router.use(authMiddleware);
router.get("/report", appCoachController.report);
router.get("/generation-status", appCoachController.generationStatus);
/** 가격 변동 범위 — 소유자 전용(F008 `BFF-REQ-037`, `ADR-003`) */
router.get("/forecast", appCoachController.forecast);
router.get("/events", appCoachController.events);
router.get("/positioning", appCoachController.positioning);

/**
 * F009 거래 기록 · 계획 · 사이즈 계산 · 리스크 예산 (`BFF-REQ-038`). 금액 · 비율은 서버가 계산한다.
 * `trades` 는 이미 한 거래를 **적는** 곳이다 — 주문 경로가 아니다(수동 입력).
 */
router.post("/size-check", appTradeRiskController.sizeCheck);
router.get("/risk-budget", appTradeRiskController.riskBudget);
router.put("/risk-budget", appTradeRiskController.updateRiskBudget);
router.get("/plans", appTradeRiskController.listPlans);
router.post("/plans", appTradeRiskController.createPlan);
router.patch("/plans/:id", appTradeRiskController.updatePlan);
router.post("/trades", appTradeRiskController.recordTrade);

/**
 * F009 슬라이스 5 — 내 거래 미러 · 결정 결과 · 태그 확정 (`BFF-REQ-038` FR-7~9). 판정 · 비용 · 엣지 없음은 서버가 센다.
 */
router.get("/mirror", appBehaviorMirrorController.mirror);
router.get("/outcomes", appBehaviorMirrorController.listOutcomes);
router.put("/outcomes/:id/tags", appBehaviorMirrorController.confirmOutcomeTags);
// F009 슬라이스 6 — 월간 복기(`BFF-REQ-038` FR-10)
router.get("/review/monthly", appBehaviorMirrorController.monthlyReview);

/** F010 슬라이스 3 — 판정 성적표(신호 유형별, 사용자별 아님). `/investments` 카드(`BFF-REQ-039` FR-5) */
router.get("/scoreboard", appJudgmentScoreboardController.scoreboard);

/** F010 슬라이스 5 — 확률 없는 목표 비중 안내. `/investments` [오늘의 판정](`BFF-REQ-041`) */
router.get("/target-weights", appTargetWeightController.targetWeights);

export default router;
