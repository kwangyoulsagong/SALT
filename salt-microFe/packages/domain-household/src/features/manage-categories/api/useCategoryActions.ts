"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { householdQueryKeys, householdRequest, type CategoryRequest, type HouseholdCategory } from "@/entities/household";

/**
 * 내 분류 쓰기(가계부 S1f). 재시도하지 않는다(만들기는 같은 이름 409 로 갈린다). 성공하면 가계부 조회 전부를 다시 받는다 —
 * 칩 · 봉투 칸 · 월 화면 이름 · 50/30/20 봉투(묶음을 바꾸면 쓴 돈이 옮겨 간다)가 같이 바뀐다.
 */
const useInvalidateAll = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: householdQueryKeys.all });
};

export const useAddCategory = () => {
  const invalidate = useInvalidateAll();
  return useMutation<HouseholdCategory, Error, CategoryRequest>({
    mutationFn: (body) => householdRequest<HouseholdCategory>("POST", "/categories", body, "household-category-add"),
    onSuccess: invalidate,
  });
};

export const useEditCategory = () => {
  const invalidate = useInvalidateAll();
  return useMutation<HouseholdCategory, Error, { key: string; body: CategoryRequest }>({
    mutationFn: ({ key, body }) => householdRequest<HouseholdCategory>("PUT", `/categories/${encodeURIComponent(key)}`, body, "household-category-edit"),
    onSuccess: invalidate,
  });
};

/** 지우기 = 보관 — 지난 지출 · 봉투는 이름 그대로 남는다(서버) */
export const useArchiveCategory = () => {
  const invalidate = useInvalidateAll();
  return useMutation<{ key: string }, Error, string>({
    mutationFn: (key) => householdRequest<{ key: string }>("DELETE", `/categories/${encodeURIComponent(key)}`, undefined, "household-category-archive"),
    onSuccess: invalidate,
  });
};
