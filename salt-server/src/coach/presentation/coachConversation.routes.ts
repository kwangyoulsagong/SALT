import { Router } from "express";

import { authMiddleware } from "../../shared/presentation/authMiddleware";
import { rateLimit } from "../../shared/presentation/rateLimit";
import type { CoachUseCases } from "../application/api";
import { CoachConversationController } from "./coachConversation.controller";

/**
 * 코치 대화 경로(F006 C절 · `SRV-REQ-029`) — `/api/coach` 아래. 사람만(게스트 0).
 */
export const createCoachConversationRouter = (useCases: CoachUseCases): Router => {
  const router = Router();
  const controller = new CoachConversationController(useCases);
  router.use(authMiddleware);

  /**
   * @swagger
   * /api/coach/messages:
   *   post:
   *     summary: 코치에게 묻기 — 질문과 답 자리를 저장하고 바로 돌려준다(F006 · `SRV-REQ-029` FR-1 · 2)
   *     description: |
   *       답은 만들지 않는다 — 받은 `messageId` 로 `GET /api/coach/messages/{messageId}/stream` 을 연다.
   *       `content`(자유 문장, 500자) 또는 `chip`(추천 질문 넷) 중 하나는 있어야 한다. 둘 다 있으면 분류는 칩이 정한다.
   *       `conversationId` 가 없으면 새 대화. 남의 대화 id 면 404.
   *     tags: [Coach Conversation]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               conversationId: { type: string, format: uuid, nullable: true }
   *               content: { type: string, maxLength: 500, nullable: true, example: "내 포트폴리오 위험한가?" }
   *               chip: { type: string, nullable: true, enum: [sell_check, weekly_amount, risk_check, mistake_review] }
   *     responses:
   *       201:
   *         description: 저장됨
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
   *                     conversationId: { type: string, format: uuid }
   *                     questionId: { type: string, format: uuid }
   *                     messageId: { type: string, format: uuid, description: 답 메시지 id(선발급) }
   *       400: { description: 형식 오류 · 둘 다 없음 }
   *       401: { description: 인증 실패 }
   *       404: { description: 없는 · 남의 대화 }
   *       429: { description: 너무 잦은 질문 }
   */
  router.post("/messages", rateLimit({ windowMs: 60_000, max: 20 }), controller.ask);

  /**
   * @swagger
   * /api/coach/messages/{messageId}/stream:
   *   get:
   *     summary: 답 스트림(SSE) — 저장돼 있으면 그대로, 아니면 지금 만든다(F006 · `SRV-REQ-029` FR-3~11)
   *     description: |
   *       `text/event-stream`. 이벤트:
   *
   *       - `message.start` `{ messageId }`
   *       - `message.delta` `{ text }` — 문장 하나. 이벤트 `id` = 문장 번호(0부터). `Last-Event-ID` 를 주면 그 다음 문장부터
   *       - `message.card` — 저장 추천 카드 완성 객체 한 번(팔기 · 이번 주 금액 질문만, 저장 추천이 있을 때). 이벤트 `id` = 문장 수.
   *         `renderable: true` 면 코치 상세 `recommendation` 과 같은 모양 + `generatedAt`, `false` 면 `blockedReason` · `signalTrackRecord` ·
   *         빈 `failureCases` · `generatedAt` 만(행동 · 종목 · 근거 없음 — 3종 게이트)
   *       - `message.done` `{ messageId, intent, explanationSource, links[], gaps[], replayed }` — `links` 는 화면 이동 코드(`risk_budget` ·
   *         `profit_plan` · `behavior_mirror` · `size_check` · `symbol`+`symbol`), `gaps` 는 못 읽은 재료(그 문장은 "불러올 수 없어요")
   *       - `message.error` `{ code, fallbackText }` — `LLM_TIMEOUT`(60초 넘게 멈춘 답) · `LLM_ERROR`
   *
   *       답은 서버 규칙 문장이다(`explanationSource: rule`) — 숫자는 위험 예산 · 익절/손절 계획 · 행동 코치가 낸 값. 같은 답에
   *       스트림이 둘 붙어도 답은 한 벌. 한 사람 동시 스트림 4개 넘으면 429. 주문을 내는 경로는 없다.
   *     tags: [Coach Conversation]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: messageId
   *         required: true
   *         schema: { type: string, format: uuid }
   *       - in: header
   *         name: Last-Event-ID
   *         required: false
   *         schema: { type: integer }
   *     responses:
   *       200:
   *         description: SSE 스트림
   *         content:
   *           text/event-stream:
   *             schema: { type: string }
   *       401: { description: 인증 실패 }
   *       404: { description: 없는 · 남의 메시지, 또는 질문 행 }
   *       429: { description: 동시 스트림 상한 }
   */
  router.get("/messages/:id/stream", controller.stream);

  /**
   * @swagger
   * /api/coach/conversations:
   *   get:
   *     summary: 내 코치 대화 목록 — 최근 대화가 앞, 커서 페이징(`SRV-REQ-029` FR-28)
   *     tags: [Coach Conversation]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema: { type: integer, minimum: 1, maximum: 50, default: 20 }
   *       - in: query
   *         name: cursor
   *         description: 앞 쪽의 `nextCursor`
   *         schema: { type: string, format: uuid }
   *     responses:
   *       200:
   *         description: "`{ items: [{ id, title, messageCount, lastMessageAt, createdAt }], nextCursor }`"
   *       401: { description: 인증 실패 }
   */
  router.get("/conversations", controller.listConversations);

  /**
   * @swagger
   * /api/coach/briefing:
   *   get:
   *     summary: 오늘의 브리핑 — 대화 첫 메시지(F006 FR-21 · 2단계). 저장하지 않는다
   *     description: |
   *       답과 같은 재료(코인 보유 점검 · 위험 예산 · 저장 추천 카드)로 만든 서버 규칙 문장. 재료 하나를 못 읽으면 그 줄만
   *       "불러올 수 없어요" + `gaps`. `card` 는 `message.card` 와 같은 모양(없으면 `null`).
   *     tags: [Coach Conversation]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: "`{ generatedAt, sentences[], links[], gaps[], card, explanationSource: rule }`"
   *       401: { description: 인증 실패 }
   */
  router.get("/briefing", controller.briefing);

  /**
   * @swagger
   * /api/coach/conversations/{id}/messages:
   *   get:
   *     summary: 대화의 메시지 — 최신이 앞(역순 커서, `SRV-REQ-029` FR-28)
   *     tags: [Coach Conversation]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string, format: uuid }
   *       - in: query
   *         name: limit
   *         schema: { type: integer, minimum: 1, maximum: 50, default: 20 }
   *       - in: query
   *         name: cursor
   *         schema: { type: string, format: uuid }
   *     responses:
   *       200:
   *         description: "`{ items: [{ id, role, content, intent, status, explanationSource, links, gaps, errorCode, card, createdAt }], nextCursor }`"
   *       401: { description: 인증 실패 }
   *       404: { description: 없는 · 남의 대화 }
   */
  router.get("/conversations/:id/messages", controller.listMessages);

  /**
   * @swagger
   * /api/coach/conversations/{id}:
   *   delete:
   *     summary: 대화 지우기 — 사용자가 요청할 때만(`SRV-REQ-029` FR-29). 메시지도 같이
   *     tags: [Coach Conversation]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string, format: uuid }
   *     responses:
   *       204: { description: 지움 }
   *       401: { description: 인증 실패 }
   *       404: { description: 없는 · 남의 대화 }
   */
  router.delete("/conversations/:id", controller.deleteConversation);

  return router;
};
