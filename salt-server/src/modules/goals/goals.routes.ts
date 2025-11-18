import { Router } from 'express';
import { GoalsController } from './goals.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();
const goalsController = new GoalsController();

// 모든 라우트에 인증 필요
router.use(authMiddleware);

/**
 * @swagger
 * /api/goals:
 *   post:
 *     summary: 저축 목표 생성
 *     tags: [Goals]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - category
 *               - targetAmount
 *               - startDate
 *               - targetDate
 *             properties:
 *               title:
 *                 type: string
 *               category:
 *                 type: string
 *                 enum: [travel, first_car, startup, wedding, creative, other]
 *               targetAmount:
 *                 type: number
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               targetDate:
 *                 type: string
 *                 format: date-time
 *               themeColor:
 *                 type: string
 *     responses:
 *       201:
 *         description: 목표 생성 성공
 */
router.post('/', goalsController.createGoal);

/**
 * @swagger
 * /api/goals:
 *   get:
 *     summary: 저축 목표 목록 조회
 *     tags: [Goals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, completed, paused]
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: 목표 목록
 */
router.get('/', goalsController.getGoals);

/**
 * @swagger
 * /api/goals/statistics:
 *   get:
 *     summary: 저축 통계 조회
 *     tags: [Goals]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 통계 정보
 */
router.get('/statistics', goalsController.getStatistics);

/**
 * @swagger
 * /api/goals/{id}:
 *   get:
 *     summary: 저축 목표 상세 조회
 *     tags: [Goals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 목표 상세 정보
 */
router.get('/:id', goalsController.getGoalById);

/**
 * @swagger
 * /api/goals/{id}:
 *   patch:
 *     summary: 저축 목표 수정
 *     tags: [Goals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               category:
 *                 type: string
 *               targetAmount:
 *                 type: number
 *               targetDate:
 *                 type: string
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: 목표 수정 성공
 */
router.patch('/:id', goalsController.updateGoal);

/**
 * @swagger
 * /api/goals/{id}:
 *   delete:
 *     summary: 저축 목표 삭제
 *     tags: [Goals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 목표 삭제 성공
 */
router.delete('/:id', goalsController.deleteGoal);

/**
 * @swagger
 * /api/goals/{id}/savings:
 *   post:
 *     summary: 저축 기록 추가
 *     tags: [Goals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *               note:
 *                 type: string
 *               transactionDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: 저축 기록 추가 성공
 */
router.post('/:id/savings', goalsController.addSaving);

/**
 * @swagger
 * /api/goals/{id}/progress:
 *   get:
 *     summary: 목표 진행률 조회
 *     tags: [Goals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 진행률 정보
 */
router.get('/:id/progress', goalsController.getGoalProgress);

export default router;
