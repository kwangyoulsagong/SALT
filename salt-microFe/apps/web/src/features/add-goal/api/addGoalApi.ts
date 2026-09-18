import axios from "axios";

import { authHeader } from "@/shared/api";
import { INVESTMENTS_BASE_URL } from "@/shared/config";

import { CreateGoalRequest } from "../model/types";

/** mutation 은 feature 가 갖는다 (`fsd-entities.md` — entities/api 는 조회만). */
export const addGoalApi = {
  create: async (body: CreateGoalRequest): Promise<void> => {
    await axios.post(`${INVESTMENTS_BASE_URL}/api/goals`, body, {
      headers: authHeader(),
    });
  },
};
