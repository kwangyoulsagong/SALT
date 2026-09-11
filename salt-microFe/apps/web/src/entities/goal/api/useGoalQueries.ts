"use client";

import { useQuery } from "@tanstack/react-query";

import { goalApi } from "./goalApi";
import { goalQueryKeys } from "./queryKeys";

export const useGoalSummary = () =>
  useQuery({
    queryKey: [goalQueryKeys.mySummary],
    queryFn: goalApi.mySummary,
  });

export const useGoalProgressList = () =>
  useQuery({
    queryKey: [goalQueryKeys.progressList],
    queryFn: goalApi.progressList,
  });
