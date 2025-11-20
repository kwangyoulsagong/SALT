import { Router } from 'express';
import { DrawingController } from './drawing.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();
const drawingController = new DrawingController();

/**
 * @swagger
 * tags:
 *   name: Drawings
 *   description: 차트 드로잉 관리
 */

/**
 * @swagger
 * /api/investment/drawings:
 *   post:
 *     summary: 드로잉 저장
 *     tags: [Drawings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - symbol
 *               - name
 *               - chartPeriod
 *               - drawingData
 *             properties:
 *               symbol:
 *                 type: string
 *                 example: BTC
 *               name:
 *                 type: string
 *                 example: 상승 추세 분석
 *               description:
 *                 type: string
 *                 example: 비트코인 상승 추세선 분석
 *               chartPeriod:
 *                 type: string
 *                 enum: [minute, hour, day, week, month]
 *                 example: day
 *               drawingData:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                       enum: [trendline, horizontal, vertical, fibonacci, rectangle, text]
 *                     points:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           x:
 *                             type: number
 *                           y:
 *                             type: number
 *                     color:
 *                       type: string
 *                     width:
 *                       type: number
 *               thumbnail:
 *                 type: string
 *                 format: uri
 *               isPublic:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       201:
 *         description: 드로잉 생성 성공
 */
router.post('/', authMiddleware, drawingController.createDrawing);

/**
 * @swagger
 * /api/investment/drawings/my:
 *   get:
 *     summary: 내 드로잉 목록 조회
 *     tags: [Drawings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: symbol
 *         schema:
 *           type: string
 *         description: 코인 심볼 (선택)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: 성공
 */
router.get('/my', authMiddleware, drawingController.getMyDrawings);

/**
 * @swagger
 * /api/investment/drawings/public:
 *   get:
 *     summary: 공개 드로잉 목록 조회 (커뮤니티)
 *     tags: [Drawings]
 *     parameters:
 *       - in: query
 *         name: symbol
 *         schema:
 *           type: string
 *         description: 코인 심볼 (선택)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: 성공
 */
router.get('/public', drawingController.getPublicDrawings);

/**
 * @swagger
 * /api/investment/drawings/{id}:
 *   get:
 *     summary: 드로잉 상세 조회
 *     tags: [Drawings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 성공
 */
router.get('/:id', drawingController.getDrawingById);

/**
 * @swagger
 * /api/investment/drawings/{id}:
 *   patch:
 *     summary: 드로잉 수정
 *     tags: [Drawings]
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
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               drawingData:
 *                 type: array
 *               thumbnail:
 *                 type: string
 *               isPublic:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: 수정 성공
 */
router.patch('/:id', authMiddleware, drawingController.updateDrawing);

/**
 * @swagger
 * /api/investment/drawings/{id}:
 *   delete:
 *     summary: 드로잉 삭제
 *     tags: [Drawings]
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
 *         description: 삭제 성공
 */
router.delete('/:id', authMiddleware, drawingController.deleteDrawing);

/**
 * @swagger
 * /api/investment/drawings/{id}/like:
 *   post:
 *     summary: 드로잉 좋아요
 *     tags: [Drawings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 성공
 */
router.post('/:id/like', drawingController.toggleLike);

export default router;
