import axios from "axios";

import { authHeader } from "@/shared/api";
import { INVESTMENTS_BASE_URL } from "@/shared/config";

import type { OnboardingStatus } from "../model/types";
import { ONBOARDING_ENDPOINTS } from "./endpoints";

/** 조회만 둔다 — 초대 수락(mutation)은 `features/accept-invite` 의 것이다. */
export const onboardingApi = {
  status: async (): Promise<OnboardingStatus> => {
    const { data } = await axios.get<OnboardingStatus>(
      `${INVESTMENTS_BASE_URL}${ONBOARDING_ENDPOINTS.status()}`,
      { headers: authHeader() },
    );
    return data;
  },
};
