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

export interface GoalProgress {
  progress: number;
  complete: number;
  dday: number;
  percent: number;
}

export interface GoalSaved {
  money: string;
  thumbnail: string;
}

export interface GoalListItem {
  id: number;
  tag: GoalCategory;
  saved: string;
  target: string;
}
