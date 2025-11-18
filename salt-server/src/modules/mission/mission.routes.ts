import { Router } from 'express';
import { MissionController } from './mission.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();
const missionController = new MissionController();

// 사용자용 라우트
router.use(authMiddleware);

/**
 * @swagger
 * /api/missions:
 *   get:
 *     summary: 미션 목록 조회
 *     tags: [Missions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: missionType
 *         schema:
 *           type: string
 *           enum: [saving, investment, learning, social]
 *       - in: query
 *         name: difficulty
 *         schema:
 *           type: string
 *           enum: [easy, medium, hard]
 *       - in: query
 *         name: isActive
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
 *         description: 미션 목록
 */
router.get('/', missionController.getMissions);

/**
 * @swagger
 * /api/missions/today:
 *   get:
 *     summary: 오늘의 미션 조회
 *     tags: [Missions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 오늘의 미션 목록 (진행 상황 포함)
 */
router.get('/today', missionController.getTodayMissions);

/**
 * @swagger
 * /api/missions/my/history:
 *   get:
 *     summary: 내 미션 기록 조회
 *     tags: [Missions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, completed, failed]
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
 *         description: 미션 기록
 */
router.get('/my/history', missionController.getUserMissionHistory);

/**
 * @swagger
 * /api/missions/my/stats:
 *   get:
 *     summary: 내 미션 통계 조회
 *     tags: [Missions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 미션 통계
 */
router.get('/my/stats', missionController.getUserMissionStats);

/**
 * @swagger
 * /api/missions/{id}/start:
 *   post:
 *     summary: 미션 시작
 *     tags: [Missions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: 미션 시작 성공
 */
router.post('/:id/start', missionController.startMission);

/**
 * @swagger
 * /api/missions/progress/{progressId}/complete:
 *   post:
 *     summary: 미션 완료
 *     tags: [Missions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: progressId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 미션 완료 성공 (포인트 지급)
 */
router.post('/progress/:progressId/complete', missionController.completeMission);

// 관리자용 라우트 (TODO: 관리자 권한 미들웨어 추가)
/**
 * @swagger
 * /api/missions/admin:
 *   post:
 *     summary: 미션 생성 (관리자)
 *     tags: [Missions - Admin]
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
 *               - description
 *               - missionType
 *               - pointsReward
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               missionType:
 *                 type: string
 *                 enum: [saving, investment, learning, social]
 *               pointsReward:
 *                 type: number
 *               difficulty:
 *                 type: string
 *                 enum: [easy, medium, hard]
 *     responses:
 *       201:
 *         description: 미션 생성 성공
 */
router.post('/admin', missionController.createMission);

/**
 * @swagger
 * /api/missions/admin/{id}:
 *   patch:
 *     summary: 미션 수정 (관리자)
 *     tags: [Missions - Admin]
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
 *               description:
 *                 type: string
 *               pointsReward:
 *                 type: number
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: 미션 수정 성공
 */
router.patch('/admin/:id', missionController.updateMission);

/**
 * @swagger
 * /api/missions/admin/{id}:
 *   delete:
 *     summary: 미션 삭제 (관리자)
 *     tags: [Missions - Admin]
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
 *         description: 미션 삭제 성공
 */
router.delete('/admin/:id', missionController.deleteMission);

export default router;
