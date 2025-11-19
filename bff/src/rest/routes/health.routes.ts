import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'salt-bff',
    timestamp: new Date().toISOString(),
    ports: {
      rest: process.env.REST_PORT || 4001,
      websocket: process.env.WS_PORT || 4002,
    },
  });
});

export default router;
