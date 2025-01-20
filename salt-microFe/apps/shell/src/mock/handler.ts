import { authHandlers } from "./handlers/auth";
import { goalsHandlers } from "@repo/mocks/goals";

export const handlers = [...authHandlers, ...goalsHandlers];
