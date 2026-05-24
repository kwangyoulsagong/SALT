import { Request, Response } from "express";
import { backendApi } from "../../services/backend-api.service";

class PlaybookController {
  async list(req: Request, res: Response) {
    const token = req.token!;

    const response = await backendApi.proxyAuthRequest(
      "GET",
      "/playbooks",
      token,
    );

    res.json(response.data);
  }

  async create(req: Request, res: Response) {
    const token = req.token!;

    const response = await backendApi.proxyAuthRequest(
      "POST",
      "/playbooks",
      token,
      req.body,
    );

    res.json(response.data);
  }

  async triggers(req: Request, res: Response) {
    const token = req.token!;

    const response = await backendApi.proxyAuthRequest(
      "GET",
      "/playbook-triggers",
      token,
    );

    res.json(response.data);
  }
}

export const playbookController = new PlaybookController();
