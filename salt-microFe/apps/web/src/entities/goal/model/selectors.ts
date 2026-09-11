"use client";

import { useSelector } from "react-redux";

import { AddGoal, GoalRootState } from "./types";

/** 자기 가지만 타이핑한다 (`entities/auth/model/selectors.ts` 와 같은 이유). */
export const useGoalDraft = (): AddGoal =>
  useSelector((state: GoalRootState) => state.goal);
