import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { appHouseholdController } from "../controllers/household.controller";

const router = Router();

/**
 * 가계부 (`/api/app/household`, `BFF-REQ-048`). 서버는 Kotlin `household` 서비스 — 라우팅 표 `config/server-routes.json` `/household` → platform.
 * 목표 시계는 저축 서비스(`/savings/goal-clock`)에서 붙인다.
 */
router.post("/expenses", authMiddleware, appHouseholdController.record);
router.post("/expenses/batch", authMiddleware, appHouseholdController.recordBatch);
router.delete("/expenses/:id", authMiddleware, appHouseholdController.deleteExpense);
router.get("/goal-clock", authMiddleware, appHouseholdController.goalClock);
router.post("/parse", authMiddleware, appHouseholdController.parse);
router.get("/suggestions", authMiddleware, appHouseholdController.suggestions);
router.get("/budget", authMiddleware, appHouseholdController.budget);
router.put("/budget", authMiddleware, appHouseholdController.setBudget);
router.get("/month/:ym", authMiddleware, appHouseholdController.month);
router.post("/month/:ym/close", authMiddleware, appHouseholdController.closeMonth);
// 반복 템플릿 · 예정 행(가계부 S1b)
router.get("/templates", authMiddleware, appHouseholdController.templates);
router.post("/templates", authMiddleware, appHouseholdController.createTemplate);
router.put("/templates/:id", authMiddleware, appHouseholdController.editTemplate);
router.delete("/templates/:id", authMiddleware, appHouseholdController.endTemplate);
router.post("/occurrences/:id/confirm", authMiddleware, appHouseholdController.confirmOccurrence);
router.post("/occurrences/:id/skip", authMiddleware, appHouseholdController.skipOccurrence);
// 거울 셋(가계부 S1c) — 감정 태그 · 다음 날 만족 · 노동시간 · 무지출 달력
router.put("/expenses/:id/feeling", authMiddleware, appHouseholdController.tagFeeling);
router.delete("/expenses/:id/feeling", authMiddleware, appHouseholdController.untagFeeling);
router.post("/expenses/:id/feeling/next", authMiddleware, appHouseholdController.answerNextDay);
router.get("/settings/work-hours", authMiddleware, appHouseholdController.workHours);
router.put("/settings/work-hours", authMiddleware, appHouseholdController.setWorkHours);
router.put("/no-spend/:date", authMiddleware, appHouseholdController.markNoSpend);
router.delete("/no-spend/:date", authMiddleware, appHouseholdController.unmarkNoSpend);
// 고정비 찾기(가계부 S1e) — 후보 목록은 월 화면 fixedCosts
router.post("/fixed-costs/hide", authMiddleware, appHouseholdController.hideFixedCost);
router.post("/fixed-costs/show", authMiddleware, appHouseholdController.showFixedCost);
// 이야기 카드(가계부 S1g) — period = YYYY-MM | YYYY. 줄 · 금액 · 몫은 서버
router.get("/story/:period", authMiddleware, appHouseholdController.story);
// 리볼빙 명세서(가계부 S1h) — 추정 · 경계는 서버. 월 띠는 month 응답 revolving
router.get("/revolving", authMiddleware, appHouseholdController.revolving);
router.post("/revolving", authMiddleware, appHouseholdController.addRevolving);
router.put("/revolving/:id", authMiddleware, appHouseholdController.editRevolving);
router.post("/revolving/:id/end", authMiddleware, appHouseholdController.endRevolving);
// 사람 장부 · 해 경조사 봉투(가계부 S1h) — 상대 이름은 민감 정보
router.get("/people", authMiddleware, appHouseholdController.people);
router.post("/people/entries", authMiddleware, appHouseholdController.addPersonEntry);
router.put("/people/entries/:id", authMiddleware, appHouseholdController.editPersonEntry);
router.delete("/people/entries/:id", authMiddleware, appHouseholdController.deletePersonEntry);
router.put("/people/envelope/:year", authMiddleware, appHouseholdController.putOccasionEnvelope);
router.delete("/people/envelope/:year", authMiddleware, appHouseholdController.deleteOccasionEnvelope);
// 내 분류(가계부 S1f) — 지우기는 보관(지난 지출 이름은 남는다)
router.get("/categories", authMiddleware, appHouseholdController.categories);
router.post("/categories", authMiddleware, appHouseholdController.addCategory);
router.put("/categories/:key", authMiddleware, appHouseholdController.editCategory);
router.delete("/categories/:key", authMiddleware, appHouseholdController.archiveCategory);
// 내가 고르는 챌린지(가계부 S1d) — 보태기는 가계부 · 저축 두 서비스(순서는 서비스 주석)
router.get("/challenges", authMiddleware, appHouseholdController.challenges);
router.post("/challenges", authMiddleware, appHouseholdController.startChallenge);
router.post("/challenges/:id/end", authMiddleware, appHouseholdController.endChallenge);
router.put("/challenges/:id/days/:date", authMiddleware, appHouseholdController.markChallengeDay);
router.delete("/challenges/:id/days/:date", authMiddleware, appHouseholdController.unmarkChallengeDay);
router.post("/challenges/:id/savings", authMiddleware, appHouseholdController.recordChallengeSaving);
router.delete("/challenge-savings/:id", authMiddleware, appHouseholdController.deleteChallengeSaving);
router.post("/challenge-savings/:id/contribute", authMiddleware, appHouseholdController.contributeSaving);

export default router;
