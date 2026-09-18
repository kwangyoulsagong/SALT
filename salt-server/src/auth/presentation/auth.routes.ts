import { Router } from "express";

import { authMiddleware } from "../../shared/presentation/authMiddleware";
import { rateLimit } from "../../shared/presentation/rateLimit";
import type { AuthUseCases } from "../application/api";
import { AuthController } from "./auth.controller";

/**
 * 무인증으로 열린 초대 경로의 요청 제한.
 *
 * `check` 는 화면이 **입력 중에** 부르므로 한 사람이 한 창에 여러 번 부른다. 코드가
 * 8자 + 체크섬이라 분당 30회로는 맞힐 수 없고, 정상 입력은 이 한도에 닿지 않는다.
 * `accept` 는 더 좁게 건다 — 정상 사용자는 창당 한 번 부른다.
 */
const CHECK_RATE_LIMIT = { windowMs: 60_000, max: 30 };
const ACCEPT_RATE_LIMIT = { windowMs: 60_000, max: 10 };

export const createAuthRouter = (useCases: AuthUseCases): Router => {
  const router = Router();
  const authController = new AuthController(useCases);

  /**
   * @swagger
   * /api/auth/invite/check:
   *   get:
   *     summary: 초대 코드 유효성 확인 (계정을 만들지 않는다)
   *     tags: [Auth]
   *     parameters:
   *       - in: query
   *         name: code
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: |
   *           `{ valid, reasonCode? }`. `reasonCode` 는 `not_found`·`used`·`expired` 뿐이고
   *           **정원 초과는 노출하지 않는다**.
   *       429:
   *         description: 요청이 너무 잦다
   */
  router.get("/invite/check", rateLimit(CHECK_RATE_LIMIT), authController.checkInvite);

  /**
   * @swagger
   * /api/auth/invite/accept:
   *   post:
   *     summary: 초대 코드로 계정 생성 (계정이 생기는 유일한 경로)
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [code, email, nickname, password]
   *             properties:
   *               code:
   *                 type: string
   *               email:
   *                 type: string
   *                 format: email
   *               nickname:
   *                 type: string
   *               password:
   *                 type: string
   *                 minLength: 8
   *     responses:
   *       201:
   *         description: 계정 생성 성공
   *       403:
   *         description: |
   *           `code` 가 `INVITE_NOT_FOUND`·`INVITE_ALREADY_USED`·`INVITE_EXPIRED`·
   *           `INVITE_QUOTA_EXCEEDED` 중 하나다
   *       409:
   *         description: 이미 가입된 이메일 (`AUTH_EMAIL_TAKEN`). 코드는 소모되지 않는다
   */
  router.post(
    "/invite/accept",
    rateLimit(ACCEPT_RATE_LIMIT),
    authController.acceptInvite
  );

  /**
   * @swagger
   * /api/auth/login:
   *   post:
   *     summary: 로그인
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [email, password]
   *             properties:
   *               email:
   *                 type: string
   *               password:
   *                 type: string
   *     responses:
   *       200:
   *         description: 로그인 성공
   */
  router.post("/login", authController.login);

  /**
   * @swagger
   * /api/auth/refresh:
   *   post:
   *     summary: 토큰 갱신
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [refreshToken]
   *             properties:
   *               refreshToken:
   *                 type: string
   *     responses:
   *       200:
   *         description: 토큰 갱신 성공
   */
  router.post("/refresh", authController.refreshToken);

  /**
   * @swagger
   * /api/auth/me:
   *   get:
   *     summary: 현재 사용자 정보 조회
   *     tags: [Auth]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: 사용자 정보
   */
  router.get("/me", authMiddleware, authController.getMe);

  return router;
};
