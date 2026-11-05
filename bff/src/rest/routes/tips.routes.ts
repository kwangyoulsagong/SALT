import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { rateLimit } from "../middleware/rateLimit.middleware";
import { tipsController } from "../controllers/tips.controller";

const router = Router();

/**
 * 금융 팁 (`/api/app/tips`, `BFF-REQ-049`). 서버는 Kotlin `content` 서비스 — 라우팅 표 `config/server-routes.json` `/content` → platform.
 * 공개 경로(목록 · 글 · 퀴즈 풀이)는 인증 없음 + IP 제한(FR-5 — 검색 유입 대비, 막는 곳이 비용이 드는 곳보다 앞에). `/for-me` · `/quiz-cards` 를 `/:slug` 앞에 둔다.
 */
export const PUBLIC_TIPS_RATE_LIMIT = { windowMs: 60_000, max: 120 };
const publicLimit = rateLimit(PUBLIC_TIPS_RATE_LIMIT);

router.get("/", publicLimit, tipsController.list);
router.get("/for-me", authMiddleware, tipsController.forMe);
// 맞힌 카드 모음(FR-8) — 개인. `/:slug` 앞
router.get("/quiz-cards", authMiddleware, tipsController.quizCards);
router.post("/:slug/dismiss", authMiddleware, tipsController.dismiss);
// 내 숫자로 다시 읽기(FR-7) — 로그인만. 저축 · 가계부를 읽고 content 가 계산
router.get("/:slug/my-numbers", authMiddleware, tipsController.myNumbers);
// 퀴즈 풀이 — 로그인 없이도(채점만) · 있으면 기록. 공개 경로라 같은 IP 제한
router.post("/:slug/quiz", publicLimit, tipsController.answerQuiz);
router.get("/:slug", publicLimit, tipsController.detail);

export default router;
