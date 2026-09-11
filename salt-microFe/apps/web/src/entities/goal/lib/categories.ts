import { GoalCategory } from "../model/types";

/** 카테고리 목록은 목표 도메인의 것이다. `shared/lib` 가 아니다 (`fsd-shared.md`). */
export const GOAL_CATEGORIES = [
  { id: GoalCategory.Trip, label: "여행", variant: "trip" },
  { id: GoalCategory.Car, label: "자동차", variant: "car" },
  { id: GoalCategory.Shopping, label: "쇼핑", variant: "shopping" },
  { id: GoalCategory.Home, label: "집", variant: "home" },
  { id: GoalCategory.Gift, label: "선물", variant: "gift" },
  { id: GoalCategory.Married, label: "결혼", variant: "married" },
] as const;
