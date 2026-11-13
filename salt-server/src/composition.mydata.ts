/**
 * 내 데이터 — 투자 쪽(Express) 몫 내보내기 · 지우기(`SRV-REQ-048` FR-3 · 4, 서버 S3c). `/api/investment/me/data`.
 *
 * **왜 조립 자리(최상위)인가.** 표 주인이 넷(coach · portfolio · market · news)이고 지우는 순서가 컨텍스트를 넘는다(coach 결과가
 * portfolio 거래를 가리킨다). 한 컨텍스트에 두면 남의 표를 알게 된다 — 목록은 주인이 적고(`<context>/infrastructure/userRows.ts`),
 * 순서와 트랜잭션은 구현을 아는 유일한 자리(`server-architecture.md` §5)가 정한다. 플랫폼 `MyDataController` 와 같은 모양 · 같은 판정.
 *
 * 다른 서비스(저축 · 가계부 · 팁 · 알림 · identity)는 Kotlin 이 지운다. 순서는 BFF(`/api/app/me`)가 정한다 — 서비스끼리 부르지 않는다.
 */
import { NextFunction, Request, Response, Router } from "express";

import { LLM_INPUTS } from "./coach/domain";
import { COACH_USER_ROWS } from "./coach/infrastructure/userRows";
import { MARKET_USER_ROWS } from "./market/infrastructure/userRows";
import { NEWS_USER_ROWS } from "./news/infrastructure/userRows";
import { PORTFOLIO_USER_ROWS } from "./portfolio/infrastructure/userRows";
import { DomainError, ErrorKind } from "./shared/domain";
import prisma from "./shared/infrastructure/prisma";
import { checkUserRowSets, classifyUserRows, eraseUserRows, exportUserRows, type UserRowSet } from "./shared/infrastructure/userRows";
import { tokenVerifier, type TokenVerifier } from "./shared/lib/tokenVerifier";
import { authMiddleware, ResponseUtil } from "./shared/presentation";

/**
 * 코드가 없는 표 — 동면 미션(`modules/mission` 410) · 쓰는 곳 0 인 옛 알림 설정 · 실행 기록. 행은 0 이지만 사람 칸이 있어 지운다.
 * 주인이 생기면 그 컨텍스트 목록으로 옮긴다.
 */
const DORMANT_USER_ROWS: readonly UserRowSet[] = [
  { table: "user_mission_progress" },
  { table: "user_achievements" },
  { table: "point_transactions" },
  { table: "sentiment_alerts" },
  { table: "smart_money_alerts" },
  { table: "execution_logs" },
];

/** 지우는 순서 그대로 — 자식 먼저(coach 결과 → portfolio 거래) */
export const INVESTMENT_USER_ROWS: readonly UserRowSet[] = [
  ...COACH_USER_ROWS,
  ...PORTFOLIO_USER_ROWS,
  ...MARKET_USER_ROWS,
  ...NEWS_USER_ROWS,
  ...DORMANT_USER_ROWS,
];
checkUserRowSets(INVESTMENT_USER_ROWS);

export const ERASE_HEADER = "x-salt-erase";
const SERVICE = "investment";

/** 플랫폼 `EraseGrantRequired` 와 같은 코드 · 문구 */
class EraseGrantRequired extends DomainError {
  constructor() {
    super("ERASE_GRANT_REQUIRED", ErrorKind.Forbidden, "비밀번호를 다시 확인해 주세요");
  }
}

/**
 * 지우기 허가 판정 — 허가가 있고 · 유효하고 · **접근 토큰과 같은 사람**이어야 그 사람 id. 아니면 `ERASE_GRANT_REQUIRED`(403).
 * 플랫폼 `EraseGrants.require` 와 같은 판정(`userRows.test.ts` 경계 표)
 */
export const grantedUserId = async (verifier: Pick<TokenVerifier, "eraseGrant">, header: unknown, userId: string): Promise<string> => {
  const grant = typeof header === "string" && header.length > 0 ? await verifier.eraseGrant(header) : null;
  if (!grant || grant.userId !== userId) throw new EraseGrantRequired();
  return grant.userId;
};

export const createMyDataRouter = (verifier: TokenVerifier = tokenVerifier): Router => {
  const router = Router();

  /**
   * @swagger
   * /api/investment/me/data:
   *   get:
   *     summary: 투자 쪽 내 데이터 내보내기(거래 · 보유 · 관심 · 코치 기록)
   *     description: 표마다 열 이름과 행(값은 전부 글자). 운영 로그(코치 생성 · LLM 호출)는 넣지 않는다. 토큰의 사람 것만
   *     tags: [MyData]
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       200: { description: "{ service, tables: [{ name, columns, rows }] }" }
   *       401: { description: 토큰 없음 · 만료 }
   *   delete:
   *     summary: 투자 쪽 내 데이터 지우기 — 지우기 허가(X-Salt-Erase) 필요
   *     description: 한 트랜잭션. 표마다 지운 행 수. 다시 불러도 안전(두 번째는 0). 허가는 identity 가 비밀번호를 다시 확인한 뒤 준다
   *     tags: [MyData]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: header
   *         name: X-Salt-Erase
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200: { description: "{ service, deleted: { 표: 행 수 } }" }
   *       403: { description: ERASE_GRANT_REQUIRED — 허가 없음 · 다른 사람 · 만료 }
   */
  router.get("/", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tables = await exportUserRows(prisma, INVESTMENT_USER_ROWS, req.user!.userId);
      ResponseUtil.success(res, { service: SERVICE, tables });
    } catch (error) {
      next(error);
    }
  });

  router.delete("/", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = await grantedUserId(verifier, req.headers[ERASE_HEADER], req.user!.userId);
      const deleted = await prisma.$transaction((tx) => eraseUserRows(tx, INVESTMENT_USER_ROWS, userId));
      ResponseUtil.success(res, { service: SERVICE, deleted });
    } catch (error) {
      next(error);
    }
  });

  return router;
};

/**
 * 저장하는 것의 등급 · AI 로 가는 것(`SRV-REQ-048` FR-6, 서버 S3d) — `/api/investment/me/data-classification`.
 * 누구에게나 같은 답이지만 설정 화면(로그인)만 부른다 — 토큰을 요구해 다른 내 데이터 경로와 같은 문을 쓴다.
 * AI 입력 목록은 이 서비스에만 있다 — LLM 을 부르는 곳이 투자 코치 배치뿐이다(플랫폼 서비스는 LLM 을 부르지 않는다).
 */
export const createDataClassificationRouter = (): Router => {
  const router = Router();

  /**
   * @swagger
   * /api/investment/me/data-classification:
   *   get:
   *     summary: 투자 쪽이 저장하는 사람 표 · 등급 · 설명 + AI 로 보내는 입력
   *     description: 등급 record · financial · sensitive(표 주석이 원천). llmInputs 는 해설 · 등락 한 줄 배치가 프롬프트에 싣는 칸 — personal 이 전부 false
   *     tags: [MyData]
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       200: { description: "{ service, tables: [{ table, grade, about }], llmInputs: [{ job, about, inputs: [{ about, personal }] }] }" }
   *       401: { description: 토큰 없음 · 만료 }
   */
  router.get("/", authMiddleware, async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const tables = await classifyUserRows(prisma, INVESTMENT_USER_ROWS);
      const llmInputs = LLM_INPUTS.map((j) => ({ job: j.job, about: j.about, inputs: j.inputs.map((i) => ({ about: i.about, personal: i.personal })) }));
      ResponseUtil.success(res, { service: SERVICE, tables, llmInputs });
    } catch (error) {
      next(error);
    }
  });

  return router;
};
