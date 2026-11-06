import { Request, Response } from "express";
import { logger } from "../../config/logger";

/**
 * 동면 경로 (`BFF-REQ-007` A절 FR-1~6 · `BFF-REQ-008` FR-11 · `bff-architecture.md` §7).
 *
 * 등록을 풀고 404 가 아니라 **410 Gone** 을 준다. 404 는 "주소를 틀렸다"로 읽혀서
 * 프론트에 남은 호출이 버그인지 의도된 제거인지 구분이 안 된다.
 *
 * 로그는 **경로(마운트 지점)당 1회**다. 요청마다 남기면 잔여 호출 하나가 로그를 덮는다.
 * 키를 `originalUrl` 로 잡지 않는다 — `/missions/:id` 처럼 끝없이 늘어난다.
 *
 * **동면이지 삭제가 아니다.** `feed` 라우트 · 컨트롤러 · 서비스 파일은 남겨 두었다(FR-1).
 * 되살릴 때는 이 목록에서 빼고 `app.ts` 에 라우트를 다시 건다 — 목록이 한 곳이다(FR-5).
 *
 * 2026-09-22 등록. 1주(2026-09-29) 동안 로그에 잔여 호출이 0건인지 본다(FR-6).
 */
export const DORMANT_PATHS = [
  "/api/app/feed",
  "/api/missions",
  "/api/users/points",
  "/api/users/achievements",
  "/api/dashboard",
  // 스펙 목록(`/api/dashboard*`) 밖이지만 같은 게이미피케이션 요약이다 — 8값 중 미션 · 포인트가 3,
  // 목표는 `/api/goals` 가 따로 줬다(2026-11-03 은퇴 — 아래 RETIRED_PATHS). 프론트 호출 0건 (2026-09-22 추가)
  "/api/users/dashboard",
] as const;

const logged = new Set<string>();

export const goneMiddleware = (req: Request, res: Response) => {
  const key = req.baseUrl;
  if (!logged.has(key)) {
    logged.add(key);
    logger.warn("동면 경로 호출 — 프론트 잔여 호출", {
      path: key,
      method: req.method,
    });
  }

  res.status(410).json({
    success: false,
    code: "ENDPOINT_DORMANT",
    revivable: true,
    message: "This endpoint is dormant",
  });
};

/**
 * 은퇴 경로 — **동면과 다르다**: 되살리지 않고 새 계약으로 대체됐다(`revivable: false` + `replacement`).
 * 404 대신 410 + 1회 로그로 1주 잔여 호출을 본 뒤 목록째 지운다. 서버 쪽 옛 코드 삭제(`msa-services.md` §7 ⑦)와 같은 날.
 *
 * - `/api/goals` — 저축이 Kotlin `savings` 서비스로 태어났다(`SRV-REQ-045` · `BFF-REQ-047` FR-7, 2026-11-03). 데이터는 `savings-import.sql` 로 옮겼다
 * - `/api/app/onboarding/status` — 옛 3스텝(초대 · 첫 거래 · 첫 목표)이 도메인 선택 온보딩으로 바뀌었다(`BFF-REQ-046` FR-6 · `SRV-REQ-048` FR-1, 2026-11-06 서버 S3a).
 *   온보딩 라우터 뒤에 걸려 있어 `/status` 만 여기로 떨어진다
 */
export const RETIRED_PATHS: Readonly<Record<string, string>> = {
  "/api/goals": "/api/app/savings",
  "/api/app/onboarding/status": "/api/app/onboarding",
};

const retiredLogged = new Set<string>();

export const retiredMiddleware = (req: Request, res: Response) => {
  const key = req.baseUrl;
  if (!retiredLogged.has(key)) {
    retiredLogged.add(key);
    logger.warn("은퇴 경로 호출 — 프론트 잔여 호출", { path: key, method: req.method });
  }
  res.status(410).json({
    success: false,
    code: "ENDPOINT_RETIRED",
    revivable: false,
    replacement: RETIRED_PATHS[key] ?? null,
    message: "This endpoint was replaced",
  });
};
