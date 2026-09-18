import { Router } from "express";

import { authMiddleware } from "../middleware/auth.middleware";
import { rateLimit } from "../middleware/rateLimit.middleware";
import { appOnboardingController } from "../controllers/onboarding.controller";

const router = Router();

/**
 * 무인증 초대 경로의 요청 제한 (`BFF-REQ-007` FR-63).
 *
 * `check` 는 화면이 **입력 중에** 부르므로 한 사람이 한 창에 여러 번 부른다.
 * `invite`(수락)는 정상 사용자가 창당 한 번 부른다 — 더 좁게 건다.
 * 값은 서버 쪽 제한과 같게 뒀다. 다르면 둘 중 좁은 쪽만 의미가 있고 넓은 쪽은 착각을 만든다.
 */
const CHECK_RATE_LIMIT = { windowMs: 60_000, max: 30 };
const ACCEPT_RATE_LIMIT = { windowMs: 60_000, max: 10 };

/** `?code=` 유효성만 답한다. **계정을 만들지 않고 정원 초과를 노출하지 않는다.** */
router.get(
  "/invite/check",
  rateLimit(CHECK_RATE_LIMIT),
  appOnboardingController.checkInvite
);

/** 코드 수락 = 계정 생성. 실패는 `403 { reasonCode }` 다. */
router.post(
  "/invite",
  rateLimit(ACCEPT_RATE_LIMIT),
  appOnboardingController.acceptInvite
);

/** 3스텝 진행 상태. 인증이 필요하다. */
router.get("/status", authMiddleware, appOnboardingController.status);

export default router;
