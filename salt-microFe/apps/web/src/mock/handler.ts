import { authHandlers } from "./handlers/auth";
import { goalsHandlers } from "@repo/mocks/goals";
import { investmentsHandlers } from "@repo/mocks/investments";
import { rankingHandlers } from "@repo/mocks/ranking";
import { openBankHandlers } from "@repo/mocks/bank";

export const handlers = [
  ...authHandlers,
  ...goalsHandlers,
  ...investmentsHandlers,
  ...rankingHandlers,
  ...openBankHandlers,
];
