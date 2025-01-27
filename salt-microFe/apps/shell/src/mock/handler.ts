import { authHandlers } from "./handlers/auth";
import { goalsHandlers } from "@repo/mocks/goals";
import { analysisHandlers } from "@repo/mocks/analysis";
import { rankingHandlers } from "@repo/mocks/ranking";

export const handlers = [
  ...authHandlers,
  ...goalsHandlers,
  ...analysisHandlers,
  ...rankingHandlers,
];
