import { authHandlers } from "./handlers/auth";
import { goalsHandlers } from "@repo/mocks/goals";
import { analysisHandlers } from "@repo/mocks/analysis";

export const handlers = [
  ...authHandlers,
  ...goalsHandlers,
  ...analysisHandlers,
];
