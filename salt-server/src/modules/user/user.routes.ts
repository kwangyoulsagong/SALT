import { Router } from 'express';
import { UserController } from './user.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();
const userController = new UserController();

// 모든 라우트에 인증 필요
router.use(authMiddleware);

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: 프로필 조회
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 사용자 프로필 정보
 */
router.get('/profile', userController.getProfile);

/**
 * @swagger
 * /api/users/profile:
 *   patch:
 *     summary: 프로필 수정
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nickname:
 *                 type: string
 *               profileImageUrl:
 *                 type: string
 *     responses:
 *       200:
 *         description: 프로필 수정 성공
 */
router.patch('/profile', userController.updateProfile);

/**
 * @swagger
 * /api/users/password:
 *   patch:
 *     summary: 비밀번호 변경
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: 비밀번호 변경 성공
 */
router.patch('/password', userController.changePassword);

/**
 * @swagger
 * /api/users/points/transactions:
 *   get:
 *     summary: 포인트 내역 조회
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: transactionType
 *         schema:
 *           type: string
 *           enum: [earn, spend]
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
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
 *         description: 포인트 내역
 */
router.get('/points/transactions', userController.getPointTransactions);

/**
 * @swagger
 * /api/users/points/stats:
 *   get:
 *     summary: 포인트 통계
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 포인트 통계 정보
 */
router.get('/points/stats', userController.getPointStats);

/**
 * @swagger
 * /api/users/achievements:
 *   get:
 *     summary: 업적 조회
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: achievementType
 *         schema:
 *           type: string
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
 *         description: 업적 목록
 */
router.get('/achievements', userController.getAchievements);

/**
 * @swagger
 * /api/users/dashboard:
 *   get:
 *     summary: 대시보드 요약 정보
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 대시보드 통합 정보
 */
router.get('/dashboard', userController.getDashboard);

/**
 * @swagger
 * /api/users/account:
 *   delete:
 *     summary: 계정 삭제
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: 계정 삭제 성공
 */
router.delete('/account', userController.deleteAccount);

export default router;
