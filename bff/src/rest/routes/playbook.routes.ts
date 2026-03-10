import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { playbookController } from "../controllers/playbook.controller";

const router = Router();

router.get("/", authMiddleware, (req, res) =>
  playbookController.list(req, res),
);

router.post("/", authMiddleware, (req, res) =>
  playbookController.create(req, res),
);

router.get("/triggers", authMiddleware, (req, res) =>
  playbookController.triggers(req, res),
);

export default router;
