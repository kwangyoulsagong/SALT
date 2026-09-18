import { GoalCategory } from "@/entities/goal";

import { AddGoalFormInput, CreateGoalRequest } from "../model/types";

/**
 * 화면 카테고리 → 서버 카테고리.
 *
 * **두 목록이 다르다.** 화면은 `trip`·`car`·`shopping`·`home`·`gift`·`married` 여섯이고
 * 서버는 `travel`·`first_car`·`startup`·`wedding`·`creative`·`other` 여섯인데 **짝이
 * 맞지 않는다**. 겹치는 셋만 옮기고 나머지는 `other` 다 — 없는 값을 지어내면 서버가
 * 400 을 주고, 화면 목록을 서버 값으로 바꾸면 그건 변경 금지 목록(목표 카드)을 건드린다.
 *
 * 이 표가 임시라는 것을 남겨 둔다. 두 목록을 합치는 것은 `goal` 컨텍스트 이관의 일이다.
 */
const SERVER_CATEGORY: Readonly<Record<string, string>> = {
  [GoalCategory.Trip]: "travel",
  [GoalCategory.Car]: "first_car",
  [GoalCategory.Married]: "wedding",
};

const FALLBACK_CATEGORY = "other";

export const toServerGoalCategory = (category: string): string =>
  SERVER_CATEGORY[category] ?? FALLBACK_CATEGORY;

/**
 * 목표 기간 기본값 — **1년**.
 *
 * 폼에 날짜 입력이 없는데(UI 는 유지한다, `FE-REQ-010` FR-9) 서버는 `startDate` ·
 * `targetDate` 를 요구한다. 시작일은 지금이라 사실이지만 **목표일은 사용자가 고른 값이
 * 아니다** — 그래서 화면에 그 기본값을 적어 둔다. 숨기면 사용자가 고르지 않은 D-Day 가
 * 홈에 뜬다.
 */
export const DEFAULT_GOAL_MONTHS = 12;

export const defaultTargetDate = (from: Date = new Date()): Date => {
  const target = new Date(from);
  target.setMonth(target.getMonth() + DEFAULT_GOAL_MONTHS);
  return target;
};

/** 폼 입력 + 선택한 카테고리 → 서버 요청. 금액은 숫자로 보낸다(폼은 문자열을 준다). */
export const toCreateGoalRequest = (
  input: AddGoalFormInput,
  category: string,
  now: Date = new Date(),
): CreateGoalRequest => ({
  title: input.title,
  category: toServerGoalCategory(category),
  targetAmount: Number(input.amount),
  startDate: now.toISOString(),
  targetDate: defaultTargetDate(now).toISOString(),
});
