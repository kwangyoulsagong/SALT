/** 목표 저축 슬라이스의 데이터 계약. 변경 금지 목록이다 (`FE-REQ-009` FR-36). */

/** 목표 카테고리. 아이콘 variant 와 같은 값이다. */
export enum GoalCategory {
  Trip = "trip",
  Car = "car",
  Shopping = "shopping",
  Home = "home",
  Gift = "gift",
  Married = "married",
}

export interface AddCategory {
  category: string;
}

export interface AddBankAccount {
  bankAccount: string;
}

export interface AddGoal {
  category: string;
  bankAccount: string;
}

/** 이 슬라이스가 store 에 붙는 자리. */
export interface GoalRootState {
  goal: AddGoal;
}

/**
 * 목표 요약 — 서버 `GET /api/goals/statistics` 를 화면 모양으로 옮긴 것.
 *
 * `dday` · `percent` 는 **서버 통계에 없다**(목이 지어낸 값이었다). 프론트가 날짜 · 비율을
 * 계산하지 않고 `null` 로 둔다 — 화면은 "—" 를 그린다. 서버가 주면 채운다.
 */
export interface GoalProgress {
  progress: number;
  complete: number;
  dday: number | null;
  percent: number | null;
}

export interface GoalSaved {
  money: string;
  /** 서버에 대표 이미지가 없다 — `null` 이면 그리지 않는다 */
  thumbnail: string | null;
}

export interface GoalSummaryView {
  saved: GoalSaved;
  process: GoalProgress;
}

export interface GoalListItem {
  /** 서버 uuid */
  id: string;
  /** 화면 아이콘 6종에 없는 서버 분류(창업 · 창작 · 기타)는 `null` — 아이콘을 지어내지 않는다 */
  tag: GoalCategory | null;
  saved: string;
  target: string;
}
