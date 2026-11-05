"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import { useHouseholdCategories } from "../api";
import { categoryLabel, envelopeLabel } from "../model/messages";
import type { HouseholdCategory } from "../model/types";

/**
 * 내 분류 이름(가계부 S1f) — 기본 분류는 프론트 문구, 내 분류는 서버가 준 이름. 월 화면은 이미 받은 표(`month.categories`)를 넣어
 * 서버 HTML 부터 이름이 맞고, 다른 화면은 분류 표 조회 하나를 같이 쓴다(이름을 컴포넌트마다 따로 받지 않는다).
 */
const CategoryTableContext = createContext<HouseholdCategory[] | null>(null);

export const CategoryNamesProvider = ({ categories, children }: { categories: HouseholdCategory[]; children: ReactNode }) => (
  <CategoryTableContext.Provider value={categories}>{children}</CategoryTableContext.Provider>
);

/** 분류 표 — 넣어 준 표가 있으면 그것, 없으면 조회 */
export const useCategoryTable = (): HouseholdCategory[] | undefined => {
  const provided = useContext(CategoryTableContext);
  const query = useHouseholdCategories(provided === null);
  return provided ?? query.data?.categories;
};

/** 키 → 이름 함수 둘(분류 · 봉투). 이름을 못 받았으면 "내 분류" */
export const useCategoryLabel = () => {
  const table = useCategoryTable();
  return useMemo(() => {
    const names = new Map((table ?? []).flatMap((c) => (c.name === null ? [] : [[c.key, c.name] as const])));
    return { category: (key: string) => categoryLabel(key, names), envelope: (key: string) => envelopeLabel(key, names) };
  }, [table]);
};
