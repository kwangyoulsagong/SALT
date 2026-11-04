"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { householdQueryKeys, householdRequest, type WorkHoursRequest, type WorkHoursSetting } from "@/entities/household";

/** 노동시간 설정 — 통째로 바꾼다(`FE-REQ-057` FR-8 · `SRV-REQ-046` FR-15). 성공하면 가계부 조회 전부(월 화면 근무 분이 같이 바뀐다) */
export const useSetWorkHours = () => {
  const queryClient = useQueryClient();
  return useMutation<WorkHoursSetting, Error, WorkHoursRequest>({
    mutationFn: (body) => householdRequest<WorkHoursSetting>("PUT", "/settings/work-hours", body, "household-work-hours-set"),
    onSuccess: (setting) => {
      queryClient.setQueryData(householdQueryKeys.workHours(), setting);
      return queryClient.invalidateQueries({ queryKey: householdQueryKeys.all });
    },
  });
};
